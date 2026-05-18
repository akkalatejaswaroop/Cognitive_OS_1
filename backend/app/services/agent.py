from app.services.llm import OllamaService
from app.services.memory import MemoryService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    def __init__(self):
        self.llm = OllamaService()
        self.memory = MemoryService()

    async def execute_task(self, task_description: str) -> str:
        logger.info(f"Orchestrating task: {task_description}")

        # 1. Retrieve context from memory (no-op when ChromaDB is offline)
        context_data = self.memory.retrieve_memory(task_description)
        context_str = str(context_data) if context_data else "No specific prior context found."

        # 2. Build prompt
        system_prompt = (
            "You are the Cognitive OS Supervisor Agent — an intelligent personal operating system. "
            "Use the provided context to answer or execute the user's task concisely and accurately."
        )
        full_prompt = f"Context:\n{context_str}\n\nTask:\n{task_description}"

        # 3. Call local Ollama
        response = await self.llm.generate_response(
            prompt=full_prompt,
            system_prompt=system_prompt,
            model=settings.OLLAMA_DEFAULT_MODEL,
        )

        # 4. Persist interaction in memory (no-op when ChromaDB is offline)
        self.memory.store_memory(
            content=f"Task: {task_description}\nResult: {response}",
            metadata={"type": "agent_execution"},
        )

        return response
