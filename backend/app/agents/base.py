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
        parent_id = payload.get("parent_id")
        
        logger.info(f"[{self.name}] Received task {task_id}")
        
        if not hasattr(self, "task_metadata"):
            self.task_metadata = {}
        self.task_metadata[task_id] = {"parent_id": parent_id}
        
        await self.emit_status(task_id, "processing", f"{self.name} is starting task...", parent_id=parent_id)
        
        try:
            result = await self.execute(task, task_id)
            await self.emit_status(task_id, "completed", f"{self.name} completed task.", result=result, parent_id=parent_id)
        except Exception as e:
            logger.error(f"[{self.name}] Failed: {e}")
            await self.emit_status(task_id, "failed", str(e), parent_id=parent_id)
        finally:
            if task_id in self.task_metadata:
                del self.task_metadata[task_id]

    async def execute(self, task: str, task_id: str = None) -> str:
        raise NotImplementedError("Subclasses must implement execute()")

    async def emit_status(self, task_id: str, status: str, message: str, result: Any = None, parent_id: str = None):
        payload = {
            "task_id": task_id,
            "agent": self.name,
            "status": status,
            "message": message,
            "result": result
        }
        if parent_id:
            payload["parent_id"] = parent_id
        await event_bus.publish(f"task.status.{task_id}", payload)
        # Also publish to global status for websocket streaming
        await event_bus.publish("task.global_status", payload)
