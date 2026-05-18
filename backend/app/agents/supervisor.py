import uuid
from app.agents.base import BaseAgent
from app.orchestration.bus import event_bus
from app.services.llm import OpenRouterService
import logging

logger = logging.getLogger(__name__)

class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="supervisor", role="Central Orchestrator")
        self.llm = OpenRouterService()

    async def execute(self, task: str) -> str:
        # In a full system, the Supervisor analyzes intent and routes to sub-agents.
        # For MVP, we query the LLM to process the request directly.
        await self.emit_status("temp", "thinking", "Supervisor is analyzing the task...")
        
        system_prompt = (
            "You are the Supervisor Agent of Cognitive OS. "
            "You coordinate the system. Provide a clear, actionable response to the user's task."
        )
        
        response = await self.llm.generate_response(prompt=task, system_prompt=system_prompt)
        return response

    async def delegate_task(self, sub_agent: str, sub_task: str, parent_task_id: str):
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        logger.info(f"Delegating to {sub_agent}: {sub_task_id}")
        await event_bus.publish(f"agent.{sub_agent}", {
            "task_id": sub_task_id,
            "task": sub_task,
            "parent_id": parent_task_id
        })
