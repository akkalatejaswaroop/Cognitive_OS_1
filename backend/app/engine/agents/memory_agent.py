"""
Memory Agent for Cognitive OS
Handles storing, retrieving, semantic searching, and deleting episodic memories.
Backed by ChromaDB with vector embeddings and metadata filtering.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from app.engine.agents.base import BaseAgent
from app.core.database import chroma_client
from app.llm.factory import get_llm_provider
from app.llm.base import LLMProvider
from app.prompts.memory import MEMORY_RECALL_CTX

logger = logging.getLogger(__name__)


class MemoryAgent(BaseAgent):
    """
    Memory Agent for Cognitive OS.
    Stores episodic memories as embeddings in ChromaDB.
    Supports exact retrieval, semantic context search, and deletion.
    """

    def __init__(self, collection_name: str = "cognitive_memory"):
        super().__init__(name="memory-agent", role="Memory & Recall Specialist")
        self.collection_name = collection_name
        self._collection = None
        self._llm: LLMProvider = get_llm_provider()

        # ── ChromaDB Integration ──────────────────────────────────────────
        if chroma_client:
            try:
                # Creates or retrieves the collection.
                # The default embedding function used by ChromaDB is all-MiniLM-L6-v2
                # unless overridden in the chroma_client config.
                self._collection = chroma_client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"},
                )
                logger.info(f"MemoryAgent connected to ChromaDB collection: '{collection_name}'")
            except Exception as exc:
                logger.error(f"Failed to initialize ChromaDB collection: {exc}")
        else:
            logger.warning("ChromaDB client is unavailable. MemoryAgent will operate in no-op mode.")

    async def execute(self, task: str, task_id: str | None = None) -> str:
        # Extract raw task from XML if present
        from app.engine.prompts.builder import extract_xml_tag
        raw_task = extract_xml_tag(task, "raw_input") or task
        
        if raw_task.upper().startswith("RECALL:"):
            query = raw_task[7:].strip()
            return await self.search_context(query, synthesize=True)
        elif raw_task.upper().startswith("STORE:"):
            content = raw_task[6:].strip()
            memory_id = await self.save_memory(content)
            if memory_id:
                return f"Memory stored (id: {memory_id[:8]})."
            return "Failed to store memory (ChromaDB unavailable)."
        
        # Default behavior: search context
        return await self.search_context(raw_task, synthesize=True)

    # ------------------------------------------------------------------ #
    #  1. save_memory                                                    #
    # ------------------------------------------------------------------ #
    async def save_memory(
        self,
        content: str,
        user_id: str | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None
    ) -> str | None:
        """
        Embed and store a memory into ChromaDB.
        Returns the unique memory_id (uuid) on success, or None on failure.
        """
        if not self._collection:
            logger.warning("save_memory failed: ChromaDB not available.")
            return None

        memory_id = str(uuid.uuid4())
        
        # Build comprehensive metadata for future filtering
        meta = metadata or {}
        if user_id: meta["user_id"] = user_id
        if session_id: meta["session_id"] = session_id
        meta["source"] = meta.get("source", "agent")

        try:
            # ChromaDB automatically handles embedding the text content
            self._collection.upsert(
                ids=[memory_id],
                documents=[content],
                metadatas=[meta],
            )
            logger.info(f"Saved memory {memory_id[:8]} for user '{user_id}'")
            return memory_id
        except Exception as exc:
            logger.error(f"Error saving memory: {exc}")
            return None

    # ------------------------------------------------------------------ #
    #  2. retrieve_memory                                                #
    # ------------------------------------------------------------------ #
    async def retrieve_memory(self, memory_id: str) -> dict[str, Any] | None:
        """
        Retrieve an exact memory by its unique ID.
        """
        if not self._collection:
            return None

        try:
            result = self._collection.get(
                ids=[memory_id],
                include=["documents", "metadatas"]
            )
            
            if not result or not result.get("ids"):
                return None
                
            return {
                "id": result["ids"][0],
                "content": result["documents"][0],
                "metadata": result["metadatas"][0]
            }
        except Exception as exc:
            logger.error(f"Error retrieving memory {memory_id}: {exc}")
            return None

    # ------------------------------------------------------------------ #
    #  3. search_context                                                 #
    # ------------------------------------------------------------------ #
    async def search_raw_chunks(
        self,
        query: str,
        user_id: str | None = None,
        top_k: int = 5
    ) -> list[dict[str, Any]]:
        """
        Perform a semantic similarity search and return raw chunks as dictionaries.
        """
        if not self._collection:
            return []

        try:
            where = {"user_id": user_id} if user_id else None
            results = self._collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where,
                include=["documents", "metadatas", "distances"]
            )

            ids = results.get("ids", [[]])[0]
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]

            chunks = []
            for i in range(len(ids)):
                chunks.append({
                    "id": ids[i],
                    "content": docs[i],
                    "metadata": metas[i],
                    "distance": distances[i]
                })
            return chunks
        except Exception as exc:
            logger.error(f"Error during raw chunk search: {exc}")
            return []

    async def search_context(
        self, 
        query: str, 
        user_id: str | None = None, 
        top_k: int = 5,
        synthesize: bool = False
    ) -> str:
        """
        Perform a semantic similarity search using vector embeddings.
        If synthesize=True, uses the LLM to write a coherent summary of the fragments.
        Otherwise, returns the raw chunks concatenated.
        """
        if not self._collection:
            return "No memory available (ChromaDB offline)."

        try:
            # Metadata filtering
            where = {"user_id": user_id} if user_id else None

            # Vector similarity search
            results = self._collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where,
                include=["documents", "metadatas", "distances"]
            )

            # Extract documents
            docs = results.get("documents", [])
            if not docs or not docs[0]:
                return "No relevant prior context found."
                
            fragments = "\n\n".join(
                f"[Memory {i+1}] {doc}" for i, doc in enumerate(docs[0])
            )
            
            if not synthesize:
                return fragments

            # ── LLM Synthesis ──────────────────────────────────────────
            logger.info("Synthesizing context with LLM...")
            try:
                context = await self._llm.generate(
                    prompt=f"Task: {query}\n\nMemory fragments:\n{fragments}",
                    system=MEMORY_RECALL_CTX,
                    temperature=0.2,
                )
                return context
            except Exception as llm_exc:
                logger.warning(f"LLM synthesis failed, returning raw fragments: {llm_exc}")
                return fragments

        except Exception as exc:
            logger.error(f"Error during context search: {exc}")
            return "Failed to search context due to an internal error."

    # ------------------------------------------------------------------ #
    #  4. delete_memory                                                  #
    # ------------------------------------------------------------------ #
    async def delete_memory(self, memory_id: str) -> bool:
        """
        Delete a specific memory by its ID.
        Returns True if successful, False otherwise.
        """
        if not self._collection:
            return False

        try:
            self._collection.delete(ids=[memory_id])
            logger.info(f"Deleted memory {memory_id[:8]}")
            return True
        except Exception as exc:
            logger.error(f"Error deleting memory {memory_id}: {exc}")
            return False


# ============================================================================ #
#  EXAMPLE USAGE
# ============================================================================ #

async def example_usage():
    import sys
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    
    print("\n=== Initializing Memory Agent ===")
    agent = MemoryAgent(collection_name="demo_memories")
    user = "alice_123"

    print("\n=== 1. Saving Memories ===")
    m1 = await agent.save_memory(
        content="Alice prefers dark mode for all user interfaces.",
        user_id=user,
        metadata={"category": "preference"}
    )
    m2 = await agent.save_memory(
        content="Alice's project uses FastAPI and React 19.",
        user_id=user,
        metadata={"category": "project_tech"}
    )
    print(f"Saved memory 1: {m1}")
    print(f"Saved memory 2: {m2}")

    print("\n=== 2. Retrieve Exact Memory ===")
    if m1:
        exact = await agent.retrieve_memory(m1)
        print(f"Retrieved: {exact}")

    print("\n=== 3. Search Context (Semantic Vector Search) ===")
    # Notice we search for "frontend framework" but it finds "React 19"
    # because of semantic embedding similarity.
    query = "What frontend framework is Alice using?"
    print(f"Query: '{query}'")
    
    # Raw context retrieval
    raw_ctx = await agent.search_context(query=query, user_id=user, top_k=2, synthesize=False)
    print(f"\nRaw Search Results:\n{raw_ctx}")
    
    # LLM-synthesized context
    print("\nSynthesized Context:")
    synth_ctx = await agent.search_context(query=query, user_id=user, top_k=2, synthesize=True)
    print(synth_ctx)

    print("\n=== 4. Delete Memory ===")
    if m2:
        deleted = await agent.delete_memory(m2)
        print(f"Deleted memory {m2[:8]}: {deleted}")
        
        # Verify it's gone
        missing = await agent.retrieve_memory(m2)
        print(f"Verify retrieval after delete: {missing}")

if __name__ == "__main__":
    asyncio.run(example_usage())
