"""
Canonical Pydantic schemas for the Cognitive OS multi-agent system.
All agent messages, subtasks, and status events must conform to these models.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Agent message envelope ──────────────────────────────────────────────────

AgentStatus = Literal[
    "pending",
    "thinking",
    "processing",
    "completed",
    "failed",
    "retrying",
    "skipped",
]


class AgentMessage(BaseModel):
    """Single event published to / consumed from the EventBus."""

    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: str | None = None
    session_id: str = "default"
    user_id: str | None = None
    agent: str
    status: AgentStatus
    message: str
    result: Any | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    retry_count: int = 0


# ── Planning / task-graph ────────────────────────────────────────────────────


class SubTask(BaseModel):
    """Atomic unit of work produced by the PlanningAgent."""

    sub_task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_task_id: str
    agent: str                           # target agent name (e.g. "research-agent")
    description: str                     # plain-text instruction for the agent
    depends_on: list[str] = Field(       # sub_task_ids that must finish first
        default_factory=list
    )
    status: AgentStatus = "pending"
    result: Any | None = None
    error: str | None = None


class TaskGraph(BaseModel):
    """Full DAG of SubTasks for a single top-level user request."""

    task_id: str
    subtasks: list[SubTask]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Agent health ─────────────────────────────────────────────────────────────


class AgentHealth(BaseModel):
    """Snapshot of an agent's circuit-breaker state."""

    name: str
    state: Literal["CLOSED", "OPEN", "HALF_OPEN"]
    failure_count: int
    last_failure_at: datetime | None
    last_success_at: datetime | None


# ── API request / response ───────────────────────────────────────────────────


class RunTaskRequest(BaseModel):
    task: str
    session_id: str = "default"


class RunTaskResponse(BaseModel):
    success: bool
    task_id: str
    message: str


class AgentStatusResponse(BaseModel):
    task_id: str
    agents: list[AgentHealth]
