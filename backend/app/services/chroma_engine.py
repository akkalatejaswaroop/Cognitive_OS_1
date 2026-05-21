import logging
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from chromadb.utils import embedding_functions
from app.core.database import chroma_client
from app.core.config import settings

logger = logging.getLogger(__name__)

class ChromaMemoryManager:
    """
    Manages semantic memory using ChromaDB and OpenAI embeddings.
    """
    def __init__(self, collection_name: str = "cognitive_memory_v1"):
        self.collection_name = collection_name
        self.openai_ef = None
        self.collection = None

        if not chroma_client:
            logger.error("ChromaDB client is not initialized. Memory features will be unavailable.")
            return

        # Initialize OpenAI Embedding Function
        # Note: Ensure OPENAI_API_KEY is in your environment variables
        try:
            self.openai_ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=settings.OPENAI_API_KEY,
                model_name="text-embedding-3-small"
            )
            
            # Get or create collection with the embedding function
            self.collection = chroma_client.get_or_create_collection(
                name=self.collection_name,
                embedding_function=self.openai_ef,
                metadata={"hnsw:space": "cosine"} # Use cosine similarity
            )
            logger.info(f"ChromaDB collection '{self.collection_name}' initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB collection: {e}")

    def add_memory(
        self, 
        user_id: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None,
        memory_type: str = "episodic"
    ) -> str:
        """
        Adds a new memory to the vector store.
        """
        if not self.collection:
            raise RuntimeError("ChromaDB collection not initialized.")

        memory_id = str(uuid.uuid4())
        
        # Prepare metadata with mandatory user_id for isolation
        enriched_metadata = {
            "user_id": user_id,
            "memory_type": memory_type,
            "created_at": datetime.utcnow().isoformat(),
            **(metadata or {})
        }

        try:
            self.collection.add(
                documents=[content],
                metadatas=[enriched_metadata],
                ids=[memory_id]
            )
            logger.info(f"Memory {memory_id} added for user {user_id}.")
            return memory_id
        except Exception as e:
            logger.error(f"Error adding memory: {e}")
            raise e

    def search_memories(
        self, 
        user_id: str, 
        query: str, 
        n_results: int = 5,
        memory_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs a semantic search restricted to a specific user.
        """
        if not self.collection:
            return []

        # Strict user isolation filter
        where_filter = {"user_id": user_id}
        if memory_type:
            where_filter["memory_type"] = memory_type

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )

            # Format results with similarity scores
            formatted_results = []
            for i in range(len(results["ids"][0])):
                # Chroma returns distances (L2 or Cosine). 
                # For cosine distance, similarity = 1 - distance
                distance = results["distances"][0][i]
                similarity = 1 - distance if distance is not None else 0
                
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "similarity": round(similarity, 4)
                })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            return []

    def update_memory(self, memory_id: str, content: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
        """
        Updates an existing memory's content or metadata.
        """
        if not self.collection:
            return

        try:
            self.collection.update(
                ids=[memory_id],
                documents=[content] if content else None,
                metadatas=[metadata] if metadata else None
            )
            logger.info(f"Memory {memory_id} updated.")
        except Exception as e:
            logger.error(f"Error updating memory {memory_id}: {e}")
            raise e

    def delete_memory(self, memory_id: str):
        """
        Deletes a memory by ID.
        """
        if not self.collection:
            return

        try:
            self.collection.delete(ids=[memory_id])
            logger.info(f"Memory {memory_id} deleted.")
        except Exception as e:
            logger.error(f"Error deleting memory {memory_id}: {e}")
            raise e

    def clear_user_memories(self, user_id: str):
        """
        Deletes all memories for a specific user.
        """
        if not self.collection:
            return

        try:
            self.collection.delete(where={"user_id": user_id})
            logger.info(f"All memories for user {user_id} cleared.")
        except Exception as e:
            logger.error(f"Error clearing memories for user {user_id}: {e}")
            raise e
