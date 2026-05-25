"""
Research Agent for Cognitive OS
Gather relevant information from memory, uploaded documents, APIs, and web search.
Integrates with LangChain for semantic retrieval, source ranking, and citation support.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from pydantic import BaseModel, Field

# LangChain Imports
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

from app.engine.agents.base import BaseAgent

logger = logging.getLogger(__name__)


# ============================================================================ #
#  1. SOURCE RANKING & CITATION SCHEMAS
# ============================================================================ #

class SearchResult(BaseModel):
    """Schema for unified search results across internal memory and the web."""
    source_id: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    relevance_score: float = 0.0  # 0.0 to 1.0 (higher is better)
    type: str = "internal"        # 'internal' or 'web'


# ============================================================================ #
#  2. RESEARCH AGENT IMPLEMENTATION
# ============================================================================ #

class ResearchAgent(BaseAgent):
    """
    Advanced Fact-Finding and Analysis Specialist.
    Executes parallel retrieval pipelines, ranks sources, and synthesizes 
    responses with inline markdown citations.
    """

    def __init__(self, memory_collection: str = "cognitive_memory"):
        super().__init__(name="research-agent", role="Research Specialist")
        self._memory_collection = memory_collection
        self._llm = None
        self._embeddings = None
        self._vectorstore = None
        self._web_search = None
        self._openai_available = bool(os.getenv("OPENAI_API_KEY"))

    def _ensure_openai(self):
        if not self._openai_available:
            raise RuntimeError(
                "ResearchAgent requires OPENAI_API_KEY. "
                "Set it in your .env file or environment variables."
            )
        if self._llm is None:
            self._llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
            self._embeddings = OpenAIEmbeddings()
            self._vectorstore = Chroma(
                collection_name=self._memory_collection,
                embedding_function=self._embeddings,
                persist_directory="./chroma_data"
            )
    @property
    def vectorstore(self):
        """Expose the vectorstore (initializing it if necessary)."""
        self._ensure_openai()
        return self._vectorstore

    # ------------------------------------------------------------------ #
    #  3. RETRIEVAL PIPELINE (Async)
    # ------------------------------------------------------------------ #

    async def _search_internal_memory(self, query: str) -> list[SearchResult]:
        """Query ChromaDB using semantic similarity."""
        self._ensure_openai()
        try:
            # fetch top 3 internal docs with distance scores
            results = await self._vectorstore.asimilarity_search_with_score(query, k=3)
            parsed = []
            for i, (doc, distance) in enumerate(results):
                # Convert distance (lower is better) to a relevance score (0.0 to 1.0)
                # Note: Cosine distance is used by default. Score = 1 - distance
                relevance = max(0.0, 1.0 - distance)
                parsed.append(
                    SearchResult(
                        source_id=f"internal_{i}",
                        content=doc.page_content,
                        metadata=doc.metadata,
                        relevance_score=relevance,
                        type="internal"
                    )
                )
            return parsed
        except Exception as exc:
            logger.warning(f"Internal memory search failed: {exc}")
            return []

    async def _search_web(self, query: str) -> list[SearchResult]:
        """Query the web via Tavily API asynchronously."""
        self._ensure_openai()
        try:
            if not os.getenv("TAVILY_API_KEY"):
                logger.warning("TAVILY_API_KEY not set. Skipping web search.")
                return []

            # Langchain's Tavily tool runs synchronously by default; run in thread pool
            raw_results = await asyncio.to_thread(self._web_search.invoke, {"query": query})
            
            parsed = []
            for i, res in enumerate(raw_results):
                parsed.append(
                    SearchResult(
                        source_id=f"web_{i}",
                        content=res.get("content", ""),
                        metadata={"url": res.get("url", "unknown_url")},
                        relevance_score=0.85, # Web results assume baseline high relevance
                        type="web"
                    )
                )
            return parsed
        except Exception as exc:
            logger.warning(f"Web search failed: {exc}")
            return []

    async def gather_information(self, query: str) -> list[SearchResult]:
        """Run all retrieval pipelines in parallel."""
        internal_task = self._search_internal_memory(query)
        web_task = self._search_web(query)

        internal_res, web_res = await asyncio.gather(internal_task, web_task)
        return internal_res + web_res

    # ------------------------------------------------------------------ #
    #  4. RANKING LOGIC
    # ------------------------------------------------------------------ #

    def _rank_and_format_sources(self, results: list[SearchResult]) -> tuple[str, str]:
        """
        Sort sources by relevance score and format them for the LLM prompt.
        Also generates a bibliography to append to the final output.
        """
        if not results:
            return "No sources found.", "No sources cited."

        # Sort descending by relevance score
        results.sort(key=lambda x: x.relevance_score, reverse=True)

        context_blocks = []
        bibliography_lines = ["\n\n### References"]

        for idx, res in enumerate(results):
            citation_num = idx + 1
            
            # Format context block for the LLM
            context_blocks.append(
                f"[Source {citation_num}]\nType: {res.type}\nContent: {res.content}\n"
            )
            
            # Format bibliography entry
            if res.type == "internal":
                meta_info = res.metadata.get("source", "Internal Memory")
                bibliography_lines.append(f"[{citation_num}] Internal Database: {meta_info}")
            else:
                url = res.metadata.get("url", "")
                bibliography_lines.append(f"[{citation_num}] Web Search: {url}")

        context_str = "\n".join(context_blocks)
        bib_str = "\n".join(bibliography_lines)
        return context_str, bib_str

    # ------------------------------------------------------------------ #
    #  5. MAIN EXECUTION (Error Handling & Synthesis)
    # ------------------------------------------------------------------ #

    async def execute(self, task: str, task_id: str | None = None) -> str:
        # Extract raw task from XML if present
        from app.engine.prompts.builder import extract_xml_tag
        raw_task = extract_xml_tag(task, "raw_input") or task
        
        return await self.execute_research(raw_task)

    async def execute_research(self, query: str, max_retries: int = 2) -> str:
        """
        Execute the full research pipeline: 
        Retrieve -> Rank -> Synthesize -> Add Citations.
        """
        logger.info(f"Starting research on: '{query}'")

        # 1. Retrieval Pipeline
        results = await self.gather_information(query)

        # 2. Ranking Logic
        context_str, bibliography = self._rank_and_format_sources(results)

        # 3. LLM Synthesis with Citations
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", 
             "You are an expert Research Agent. Synthesize the provided sources to answer the user's query.\n"
             "CRITICAL: You must cite your sources inline using brackets corresponding to the source number, e.g., [1], [2].\n"
             "Do not hallucinate. If the sources do not contain the answer, state that you do not know."
            ),
            ("user", "Query: {query}\n\nSources:\n{context}")
        ])

        self._ensure_openai()
        chain = prompt_template | self._llm

        for attempt in range(max_retries):
            try:
                response = await chain.ainvoke({"query": query, "context": context_str})
                
                # Append the generated bibliography to the LLM's response
                final_output = response.content + bibliography
                logger.info("Research synthesis complete.")
                return final_output

            except Exception as exc:
                logger.warning(f"Synthesis failed on attempt {attempt + 1}: {exc}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    return f"Error: Failed to synthesize research after multiple attempts. Reason: {exc}"


# ============================================================================ #
#  EXAMPLE OUTPUTS / USAGE
# ============================================================================ #

async def example_usage():
    import sys
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    
    # Environment Check
    if not os.getenv("OPENAI_API_KEY"):
        print("\n[WARNING] OPENAI_API_KEY is missing. LLM calls will fail.")
        
    print("\n=== Initializing Research Agent ===")
    agent = ResearchAgent()

    # Seed the mock ChromaDB with some internal memory for the demonstration
    try:
        agent.vectorstore.add_texts(
            texts=[
                "Cognitive OS uses a multi-agent architecture with Supervisor, Memory, and Planning agents.",
                "The preferred tech stack for Cognitive OS is FastAPI on the backend and Next.js on the frontend."
            ],
            metadatas=[{"source": "architecture_doc.md"}, {"source": "tech_stack_doc.md"}]
        )
    except Exception as e:
        print(f"Skipping vectorstore seed: {e}")

    query = "What is the tech stack and architecture of Cognitive OS?"
    print(f"\nUser Query: '{query}'")
    print("Executing Research Pipeline (Retrieval -> Ranking -> Synthesis)...\n")

    result = await agent.execute_research(query)
    
    print("=== FINAL OUTPUT WITH CITATIONS ===")
    print(result)

if __name__ == "__main__":
    asyncio.run(example_usage())
