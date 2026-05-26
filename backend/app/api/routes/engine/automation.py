"""
Automation API — Endpoints for triggering and tracking production-grade workflows.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.deps import get_current_user, get_db
from app.models.domain import User
from app.engine.memory.context.automation_models import Automation, WorkflowHistory, AutomationLog
from app.engine.automation.service import WorkflowAutomationService

router = APIRouter(prefix="/automation", tags=["Workflow Automation"])

class PromptTriggerRequest(BaseModel):
    prompt: str

class TriggerResponse(BaseModel):
    execution_id: uuid.UUID
    status: str
    message: str

@router.post("/trigger/prompt", response_model=TriggerResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_from_prompt(
    request: PromptTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers a dynamic workflow generated from a natural language prompt.
    The AI Planning Agent decomposes the prompt into a Task DAG.
    """
    service = WorkflowAutomationService(db)
    try:
        execution = await service.trigger_from_prompt(
            user=current_user,
            prompt=request.prompt,
            background_tasks=background_tasks
        )
        return {
            "execution_id": execution.id,
            "status": "pending",
            "message": "Workflow decomposition started. Execution will proceed in the background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger workflow: {str(e)}")

@router.post("/trigger/{workflow_id}", response_model=TriggerResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_workflow(
    workflow_id: uuid.UUID,
    input_payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers a pre-defined async workflow execution."""
    definition = db.query(Automation).filter(Automation.id == workflow_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Workflow definition not found")

    # Create Execution Record
    execution = WorkflowHistory(
        automation_id=workflow_id,
        user_id=current_user.id,
        input_payload=input_payload,
        status="pending"
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    from app.engine.automation.executor import EnhancedWorkflowExecutor
    executor = EnhancedWorkflowExecutor(execution.id)
    background_tasks.add_task(executor.run)

    return {
        "execution_id": execution.id,
        "status": "pending",
        "message": f"Workflow '{definition.name}' triggered."
    }

@router.post("/resume/{execution_id}", response_model=TriggerResponse)
async def resume_workflow(
    execution_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resumes a failed or partial workflow execution."""
    service = WorkflowAutomationService(db)
    try:
        execution = await service.resume_execution(execution_id, background_tasks)
        return {
            "execution_id": execution.id,
            "status": "pending",
            "message": "Workflow execution resumed."
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resume workflow: {str(e)}")

@router.get("/status/{execution_id}")
async def get_execution_status(
    execution_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the high-level and granular status of a workflow execution."""
    execution = db.query(WorkflowHistory).filter(
        WorkflowHistory.id == execution_id,
        WorkflowHistory.user_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution record not found")

    steps = db.query(AutomationLog).filter(AutomationLog.history_id == execution_id).all()

    return {
        "execution_id": execution.id,
        "workflow_name": execution.automation.name,
        "status": execution.status,
        "input_payload": execution.input_payload,
        "output_result": execution.output_result,
        "error_log": execution.error_log,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "steps": [
            {
                "step_id": s.step_id,
                "agent": s.agent_name,
                "status": s.status,
                "retries": s.retry_count,
                "input": s.input_data,
                "output": s.output_data,
                "created_at": s.created_at
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
    history = db.query(WorkflowHistory).filter(
        WorkflowHistory.user_id == current_user.id
    ).order_by(WorkflowHistory.started_at.desc()).limit(limit).all()
    
    return [
        {
            "id": h.id,
            "name": h.automation.name,
            "status": h.status,
            "started_at": h.started_at,
            "completed_at": h.completed_at
        } for h in history
    ]
