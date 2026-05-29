import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from app.api.deps import get_user_from_token
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.orchestration.bus import event_bus, AgentMessage
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
        logger.info(f"WebSocket connected for task: {task_id}")

    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        logger.info(f"WebSocket disconnected for task: {task_id}")

    async def send_message(self, task_id: str, message: dict):
        if task_id in self.active_connections:
            for connection in self.active_connections[task_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending WS message: {e}")

manager = ConnectionManager()

# Global subscriber to forward events to websockets
async def handle_task_status(msg: AgentMessage):
    payload = msg.payload
    task_id = payload.get("task_id")
    if task_id:
        await manager.send_message(task_id, payload)
    
    # Also forward subtask status events to the parent WebSocket connection
    parent_id = payload.get("parent_id")
    if parent_id:
        await manager.send_message(parent_id, payload)

# Subscribe to global task status events
event_bus.subscribe("task.global_status", handle_task_status)

@router.websocket("/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str, db: Session = Depends(get_db)):
    token = websocket.cookies.get("access_token")
    if token and token.startswith("Bearer "):
        token = token[7:]
    
    try:
        if not token:
            raise Exception("No token")
        await asyncio.to_thread(get_user_from_token, db, token)
    except Exception:
        await websocket.accept()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, task_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
