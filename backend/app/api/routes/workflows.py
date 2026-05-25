"""
Workflows API — CRUD for workflow definitions and execution endpoint.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.domain import Workflow, User
from app.workflows.base import WorkflowDefinition
from app.workflows.executor import WorkflowExecutor

router = APIRouter()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_workflow(
    payload: WorkflowDefinition,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a WorkflowDefinition to the database."""
    workflow = Workflow(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        dag_definition=payload.to_dag_dict(),
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return {"success": True, "workflow_id": str(workflow.id), "name": workflow.name}


@router.get("/")
async def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all workflows owned by the current user."""
    workflows = (
        db.query(Workflow)
        .filter(Workflow.user_id == current_user.id)
        .order_by(Workflow.created_at.desc())
        .all()
    )
    return {
        "workflows": [
            {
                "id": str(w.id),
                "name": w.name,
                "description": w.description,
                "created_at": w.created_at.isoformat(),
            }
            for w in workflows
        ]
    }


@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a single workflow definition."""
    workflow = (
        db.query(Workflow)
        .filter(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"id": str(workflow.id), "name": workflow.name, "dag": workflow.dag_definition}


@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute a saved workflow. Returns a parent_task_id for WS streaming.
    """
    workflow = (
        db.query(Workflow)
        .filter(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    definition = WorkflowDefinition.from_dag_dict(workflow.dag_definition)
    parent_task_id = str(uuid.uuid4())

    # Run async — client streams via WS
    import asyncio
    executor = WorkflowExecutor(workflow=definition, parent_task_id=parent_task_id)
    asyncio.create_task(executor.run())

    return {
        "success": True,
        "task_id": parent_task_id,
        "message": f"Workflow '{workflow.name}' started.",
    }


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a workflow."""
    workflow = (
        db.query(Workflow)
        .filter(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
        .first()
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(workflow)
    db.commit()
