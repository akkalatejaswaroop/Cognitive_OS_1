import uuid
from app.agents.base import BaseAgent
from app.orchestration.bus import event_bus
from app.services.llm import OllamaService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="supervisor", role="Central Orchestrator")
        self.llm = OllamaService()

    async def execute(self, task: str) -> str:
        """Analyse intent and generate a response via local Ollama."""
        await self.emit_status("temp", "thinking", "Supervisor is analysing the task...")

        system_prompt = (
            "You are the Supervisor Agent of Cognitive OS — an intelligent personal operating system. "
            "You coordinate tasks, reason carefully, and provide clear, actionable responses. "
            f"Using model: {settings.OLLAMA_DEFAULT_MODEL}."
        )

        response = await self.llm.generate_response(
            prompt=task,
            system_prompt=system_prompt,
            model=settings.OLLAMA_DEFAULT_MODEL,
        )
        return response

    async def delegate_task(self, sub_agent: str, sub_task: str, parent_task_id: str):
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        logger.info(f"Delegating to {sub_agent}: {sub_task_id}")
        await event_bus.publish(f"agent.{sub_agent}", {
            "task_id": sub_task_id,
            "task": sub_task,
            "parent_id": parent_task_id,
        })
