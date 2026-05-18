from fastapi import APIRouter, Depends
from pydantic import BaseModel
import uuid
from app.api.deps import get_current_user
from app.orchestration.bus import event_bus

router = APIRouter()

class TaskRequest(BaseModel):
    task: str

@router.post("/execute")
async def execute_agent_task(req: TaskRequest, current_user = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    
    # Push task to the Supervisor Agent via Event Bus
    await event_bus.publish("agent.supervisor", {
        "task_id": task_id,
        "task": req.task
    })
    
    # Immediately return the task_id so frontend can connect via WebSocket
    return {
        "success": True, 
        "task_id": task_id, 
        "message": "Task dispatched to Supervisor Agent."
    }
