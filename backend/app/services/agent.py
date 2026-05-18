from app.services.llm import OpenRouterService
from app.services.memory import MemoryService
import logging

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    def __init__(self):
        self.llm = OpenRouterService()
        self.memory = MemoryService()

    async def execute_task(self, task_description: str) -> str:
        logger.info(f"Orchestrating task: {task_description}")
        
        # 1. Retrieve Context from Memory
        context_data = self.memory.retrieve_memory(task_description)
        context_str = str(context_data) if context_data else "No specific prior context found."

        # 2. Build Prompt for LLM
        system_prompt = (
            "You are the Cognitive OS Supervisor Agent. "
            "Use the provided context to answer or execute the user's task."
        )
        full_prompt = f"Context:\n{context_str}\n\nTask:\n{task_description}"

        # 3. Call LLM
        response = await self.llm.generate_response(
            prompt=full_prompt, 
            system_prompt=system_prompt,
            model="openai/gpt-3.5-turbo" # Defaulting to a standard model
        )

        # 4. Store interaction in Memory
        self.memory.store_memory(
            content=f"Task: {task_description}\nResult: {response}",
            metadata={"type": "agent_execution"}
        )

        return response
