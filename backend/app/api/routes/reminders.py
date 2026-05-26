"""
Smart Reminders API — Cognitive OS.
Endpoints for priority management, adaptive learning, and context-aware alerts.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.models.domain import User
from app.services.reminder import SmartReminderService

router = APIRouter(prefix="/reminders", tags=["Smart Reminders"])

class ReminderCreate(BaseModel):
    content: str
    due_at: datetime
    importance: int = 5
    category: str = "General"
    context_requirements: Optional[List[str]] = []
    is_predicted: bool = False

class ReminderResponse(BaseModel):
    id: uuid.UUID
    content: str
    due_at: datetime
    smart_priority_score: float
    status: str
    category: str
    importance_score: int

@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new AI-generated or user-defined smart reminder."""
    service = SmartReminderService(db)
    reminder = await service.create_smart_reminder(
        user_id=current_user.id,
        content=payload.content,
        due_at=payload.due_at,
        importance=payload.importance,
        category=payload.category,
        context_requirements=payload.context_requirements,
        is_predicted=payload.is_predicted
    )
    return reminder

@router.get("/top", response_model=List[ReminderResponse])
async def get_top_reminders(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the highest priority reminders for the current context."""
    service = SmartReminderService(db)
    return service.get_top_reminders(current_user.id, limit)

@router.post("/{reminder_id}/snooze")
async def snooze_reminder(
    reminder_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Snoozes a reminder and updates the adaptive learning model."""
    service = SmartReminderService(db)
    service.handle_snooze(reminder_id)
    return {"message": "Reminder snoozed. Priority adjusted for adaptive learning."}

@router.post("/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks a reminder as completed."""
    from app.engine.memory.context.automation_models import Reminder
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, 
        Reminder.user_id == current_user.id
    ).first()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    reminder.status = "completed"
    db.commit()
    return {"message": "Task marked as completed."}
