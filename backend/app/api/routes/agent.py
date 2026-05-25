"""
Agent API routes — task dispatch, status, history, and health endpoints.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.orchestration.bus import event_bus
from app.orchestration.circuit_breaker import circuit_registry
from app.agents.registry import AgentRegistry

router = APIRouter()


# ── Request / Response models ─────────────────────────────────────────────────

class TaskRequest(BaseModel):
    task: str
    session_id: str = "default"


class TaskResponse(BaseModel):
    success: bool
    task_id: str
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/execute", response_model=TaskResponse)
async def execute_agent_task(
    req: TaskRequest,
    current_user=Depends(get_current_user),
):
    """
    Dispatch a task to the Orchestrator Agent.
    Returns a task_id immediately; connect to WS /api/v1/ws/<task_id> for live updates.
    """
    task_id = str(uuid.uuid4())

    await event_bus.publish("agent.supervisor", {
        "task_id": task_id,
        "task": req.task,
        "session_id": req.session_id,
        "user_id": str(current_user.id),
    })

    return TaskResponse(
        success=True,
        task_id=task_id,
        message="Task dispatched to Supervisor Agent.",
    )


@router.get("/health")
async def agent_health(current_user=Depends(get_current_user)):
    """
    Return the circuit-breaker state for all registered agents.
    Useful for monitoring and debugging.
    """
    return {
        "agents": circuit_registry.all_states(),
        "registered": AgentRegistry.get().agent_names(),
    }


@router.get("/tools")
async def list_tools(current_user=Depends(get_current_user)):
    """Return all registered tools available to the Execution Agent."""
    from app.tools.registry import tool_registry
    return {"tools": tool_registry.list_tools()}
