"""
Automation API — Endpoints for triggering and tracking production-grade workflows.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import uuid
from typing import List, Dict, Any

from app.api.deps import get_current_user, get_db
from app.models.domain import User
from app.engine.memory.context.automation_models import WorkflowDefinition, WorkflowExecution, WorkflowStepLog
from app.engine.automation.executor import EnhancedWorkflowExecutor

router = APIRouter(prefix="/automation", tags=["Workflow Automation"])

@router.post("/trigger/{workflow_id}")
async def trigger_workflow(
    workflow_id: uuid.UUID,
    input_payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers an async workflow execution."""
    definition = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == workflow_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Workflow definition not found")

    # 1. Create Execution Record
    execution = WorkflowExecution(
        definition_id=workflow_id,
        user_id=current_user.id,
        input_payload=input_payload,
        status="pending"
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    # 2. Hand off to background executor
    executor = EnhancedWorkflowExecutor(execution.id)
    background_tasks.add_task(executor.run)

    return {
        "execution_id": execution.id,
        "status": "triggered",
        "message": f"Workflow '{definition.name}' is now running in the background."
    }

@router.get("/status/{execution_id}")
async def get_execution_status(
    execution_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the high-level and granular status of a workflow execution."""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.user_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution record not found")

    steps = db.query(WorkflowStepLog).filter(WorkflowStepLog.execution_id == execution_id).all()

    return {
        "execution_id": execution.id,
        "workflow_name": execution.definition.name,
        "status": execution.status,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "steps": [
            {
                "step_id": s.step_id,
                "agent": s.agent_name,
                "status": s.status,
                "retries": s.retry_count,
                "output": s.output_data
            } for s in steps
        ]
    }

@router.get("/history")
async def list_automation_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists recent automation history for the current user."""
    history = db.query(WorkflowExecution).filter(
        WorkflowExecution.user_id == current_user.id
    ).order_by(WorkflowExecution.started_at.desc()).limit(limit).all()
    
    return [
        {
            "id": h.id,
            "name": h.definition.name,
            "status": h.status,
            "started_at": h.started_at
        } for h in history
    ]
