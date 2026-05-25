"""
Workflow definitions — Pydantic models that map to the dag_definition JSONB column
in the existing `workflows` table.
"""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class WorkflowStep(BaseModel):
    """A single step in a workflow DAG."""

    step_id: str
    agent: str                              # e.g. "research-agent"
    instruction: str                        # Task text sent to the agent
    depends_on: list[str] = Field(          # step_ids this step waits for
        default_factory=list
    )
    on_failure: Literal["stop", "skip", "retry"] = "stop"
    metadata: dict[str, Any] = Field(default_factory=dict)


class WorkflowDefinition(BaseModel):
    """
    Complete workflow DAG.
    Serialised to / from the `dag_definition` JSONB column in PostgreSQL.
    """

    name: str
    description: str = ""
    version: str = "1.0"
    steps: list[WorkflowStep]

    def to_dag_dict(self) -> dict:
        """Serialise for storage in dag_definition column."""
        return self.model_dump()

    @classmethod
    def from_dag_dict(cls, data: dict) -> "WorkflowDefinition":
        """Deserialise from dag_definition column."""
        return cls.model_validate(data)
