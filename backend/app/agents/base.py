import logging
from typing import Any, Dict
from app.orchestration.bus import event_bus

logger = logging.getLogger(__name__)

class BaseAgent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        # Auto-subscribe to tasks directed to this agent
        event_bus.subscribe(f"agent.{self.name}", self._handle_event)

    async def _handle_event(self, payload: Dict[str, Any]):
        task_id = payload.get("task_id")
        task = payload.get("task")
        
        logger.info(f"[{self.name}] Received task {task_id}")
        await self.emit_status(task_id, "processing", f"{self.name} is starting task...")
        
        try:
            result = await self.execute(task)
            await self.emit_status(task_id, "completed", f"{self.name} completed task.", result=result)
        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}")
            await self.emit_status(task_id, "failed", str(e))

    async def execute(self, task: str) -> str:
        raise NotImplementedError("Subclasses must implement execute()")

    async def emit_status(self, task_id: str, status: str, message: str, result: Any = None):
        payload = {
            "task_id": task_id,
            "agent": self.name,
            "status": status,
            "message": message,
            "result": result
        }
        await event_bus.publish(f"task.status.{task_id}", payload)
        # Also publish to global status for websocket streaming
        await event_bus.publish("task.global_status", payload)
