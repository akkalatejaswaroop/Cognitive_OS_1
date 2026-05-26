"""
Smart Reminder Service — Cognitive OS.
Handles scoring, adaptive learning, and context-aware timing.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from app.engine.memory.context.automation_models import Reminder
from app.models.domain import User

logger = logging.getLogger(__name__)

class SmartReminderService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_sps(
        self, 
        due_at: datetime, 
        importance: int, 
        context_match: float = 1.0
    ) -> float:
        """
        Calculates the Smart Priority Score.
        Formula: SPS = (Urgency * 0.45) + (Importance * 0.35) + (ContextFit * 0.20)
        """
        now = datetime.now(timezone.utc)
        time_diff = due_at - now
        hours_left = max(0, time_diff.total_seconds() / 3600)
        
        # Urgency: 10 if due now, decays over 72 hours
        urgency = max(0, 10 - (hours_left / 7.2))
        
        # Importance is 1-10
        importance_norm = float(importance)
        
        # Context match is 0.0 to 1.0 (from context engine)
        context_fit = context_match * 10.0
        
        sps = (urgency * 0.45) + (importance_norm * 0.35) + (context_fit * 0.20)
        return round(sps, 2)

    async def create_smart_reminder(
        self, 
        user_id: uuid.UUID,
        content: str,
        due_at: datetime,
        importance: int,
        category: str = "General",
        context_requirements: List[str] = None,
        is_predicted: bool = False
    ) -> Reminder:
        """Persists a new smart reminder with initial scoring."""
        sps = self.calculate_sps(due_at, importance)
        
        reminder = Reminder(
            user_id=user_id,
            content=content,
            due_at=due_at,
            importance_score=importance,
            smart_priority_score=sps,
            category=category,
            context_requirements=context_requirements or [],
            is_predicted_deadline=is_predicted,
            status="active"
        )
        
        self.db.add(reminder)
        self.db.commit()
        self.db.refresh(reminder)
        return reminder

    def handle_snooze(self, reminder_id: uuid.UUID):
        """Adaptive learning: adjust score based on user interaction."""
        reminder = self.db.query(Reminder).filter(Reminder.id == reminder_id).first()
        if not reminder:
            return
            
        reminder.snooze_count += 1
        # If snoozed often, reduce smart priority for the current time/context
        # to trigger the 'suggest new context' logic in the orchestrator.
        if reminder.snooze_count >= 3:
            reminder.smart_priority_score *= 0.8
            
        # Push due date forward 1 hour by default
        reminder.due_at += timedelta(hours=1)
        reminder.status = "snoozed"
        
        self.db.commit()
        
    def get_top_reminders(self, user_id: uuid.UUID, limit: int = 5) -> List[Reminder]:
        """Returns the highest priority reminders for the user."""
        return self.db.query(Reminder).filter(
            Reminder.user_id == user_id,
            Reminder.status.in_(["active", "snoozed"])
        ).order_by(Reminder.smart_priority_score.desc()).limit(limit).all()
