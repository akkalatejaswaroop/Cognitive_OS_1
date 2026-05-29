"""
Goal Tracking Service — Cognitive OS.
Handles parent-child short-term and long-term goal lifecycles, progress tracking,
velocity-based deadline predictions, AI milestone swarms, and smart reminders.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from app.models.domain import Goal, FocusSession, TaskHistory
from app.engine.memory.context.automation_models import Reminder
from app.services.reminder import SmartReminderService
from app.llm.factory import get_llm_provider

logger = logging.getLogger("goal_tracking_service")

class GoalTrackingService:
    def __init__(self, db: Session):
        self.db = db

    async def create_goal(
        self,
        user_id: uuid.UUID,
        title: str,
        description: Optional[str],
        target_date: datetime,
        goal_type: str = "short_term",
        parent_goal_id: Optional[uuid.UUID] = None,
        key_results: Optional[Dict[str, Any]] = None
    ) -> Goal:
        """Creates a new goal target with hierarchical parent linking and types."""
        # Ensure UTC timezone
        if target_date.tzinfo is None:
            target_date = target_date.replace(tzinfo=timezone.utc)

        goal = Goal(
            user_id=user_id,
            title=title,
            description=description,
            target_date=target_date,
            status="active",
            goal_type=goal_type,
            parent_goal_id=parent_goal_id,
            completion_percentage=0.0,
            key_results=key_results or {"milestones": []}
        )
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def list_goals(
        self,
        user_id: uuid.UUID,
        goal_type: Optional[str] = None,
        parent_goal_id: Optional[uuid.UUID] = None
    ) -> List[Goal]:
        """Lists active and completed goals based on type or parent links."""
        query = self.db.query(Goal).filter(Goal.user_id == user_id)
        if goal_type:
            query = query.filter(Goal.goal_type == goal_type)
        if parent_goal_id:
            query = query.filter(Goal.parent_goal_id == parent_goal_id)
            
        return query.order_by(Goal.target_date.asc()).all()

    def update_goal_progress(self, goal_id: uuid.UUID) -> float:
        """
        Calculates and updates completion_percentage based on milestone counts
        or linked task lists.
        Formula: Progress = (CompletedMilestones / TotalMilestones) * 100
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return 0.0

        kr = goal.key_results or {}
        milestones = kr.get("milestones", [])
        
        progress = 0.0
        if milestones:
            completed = sum(1 for m in milestones if m.get("done") is True)
            progress = round((completed / len(milestones)) * 100, 2)
        else:
            # Fallback to linked task completion rate
            tasks = self.db.query(TaskHistory).filter(TaskHistory.goal_id == goal_id).all()
            if tasks:
                completed_tasks = sum(1 for t in tasks if t.status == "completed")
                progress = round((completed_tasks / len(tasks)) * 100, 2)
            else:
                progress = goal.completion_percentage

        goal.completion_percentage = max(0.0, min(100.0, progress))
        if goal.completion_percentage >= 100.0:
            goal.status = "completed"
        
        self.db.commit()
        self.db.refresh(goal)
        return goal.completion_percentage

    async def predict_deadline(self, goal_id: uuid.UUID) -> Optional[datetime]:
        """
        Predicts actual goal completion date based on focus session speeds and logs.
        Heuristics:
          - Gathers total focus session seconds logged against this goal.
          - Calculates growth velocity: Progress / focus hours.
          - Multiplies remaining progress by growth velocity to estimate calendar days.
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return None

        # Calculate progress
        p = self.update_goal_progress(goal_id)
        if p >= 100.0:
            goal.projected_completion_date = goal.target_date
            self.db.commit()
            return goal.target_date

        # Total focus hours spent on this goal
        from sqlalchemy import func
        total_seconds = self.db.query(
            func.sum(FocusSession.duration_seconds)
        ).filter(
            FocusSession.goal_id == goal_id,
            FocusSession.ended_at.is_not(None)
        ).scalar() or 0
        focus_hours = max(0.2, total_seconds / 3600.0)

        # Velocity: progress % growth per focus hour logged
        # Default fallback: 5.0% progress per focus hour logged
        velocity = (p / focus_hours) if p > 0 else 5.0
        velocity = max(1.0, velocity) # Capped minimum velocity

        # Remaining hours needed
        remaining_progress = 100.0 - p
        hours_needed = remaining_progress / velocity

        # Gather user's daily focus session average (recent 7 days)
        # Fallback to standard 2 hours per day if no focus sessions registered
        recent_since = datetime.now(timezone.utc) - timedelta(days=7)
        avg_focus_sec = self.db.query(
            FocusSession.duration_seconds
        ).filter(
            FocusSession.user_id == goal.user_id,
            FocusSession.started_at >= recent_since,
            FocusSession.ended_at.is_not(None)
        ).all()

        daily_avg_hours = 2.0
        if avg_focus_sec:
            total_sec = sum(s[0] for s in avg_focus_sec)
            daily_avg_hours = max(0.5, (total_sec / 3600.0) / 7.0)

        # Projected days needed to complete
        days_needed = hours_needed / daily_avg_hours
        
        now = datetime.now(timezone.utc)
        projected_date = now + timedelta(days=max(0.1, days_needed))
        
        goal.projected_completion_date = projected_date
        
        # Check if projected completion exceeds target date
        target_date = goal.target_date
        if target_date.tzinfo is None:
            target_date = target_date.replace(tzinfo=timezone.utc)

        if projected_date > target_date:
            goal.status = "delayed"
        elif goal.status == "delayed":
            goal.status = "active"

        self.db.commit()
        self.db.refresh(goal)
        return projected_date

    async def suggest_milestones_ai(self, goal_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Queries active LLM provider to suggest 3-5 structured sub-milestones based
        on the goal title and description targets.
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return []

        prompt = f"""
You are the elite Planning Specialist for Cognitive OS.
Suggest 3 to 5 sequential, highly actionable sub-milestones (key results) to complete the following goal:

Title: {goal.title}
Description: {goal.description or 'No description provided.'}

You MUST return ONLY a valid, raw JSON array of objects. Do NOT wrap it in extra words.
Each object in the array MUST have the fields:
- "step": (string description of the milestone)
- "done": false (boolean)

Example JSON response:
[
  {{"step": "Setup project directory structure", "done": false}},
  {{"step": "Implement core REST endpoints", "done": false}}
]
"""
        try:
            llm = get_llm_provider()
            response = await llm.generate(
                prompt=prompt,
                system="You are an elite planner that outputs only raw, valid JSON arrays.",
                temperature=0.3,
                max_tokens=1024
            )
            
            clean_res = response.strip()
            # Strip markdown block wraps
            if "```json" in clean_res:
                clean_res = clean_res.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_res:
                clean_res = clean_res.split("```")[1].strip()

            milestones = json.loads(clean_res)
            if isinstance(milestones, list):
                return milestones
            return []
        except Exception as exc:
            logger.error(f"Failed to suggest milestones via LLM: {exc}")
            # Fallback static milestones
            return [
                {"step": f"Initialize plans for {goal.title}", "done": False},
                {"step": f"Develop core core components of {goal.title}", "done": False},
                {"step": f"Perform comprehensive QA audits", "done": False}
            ]

    def accept_milestones(self, goal_id: uuid.UUID, milestones: List[Dict[str, Any]]) -> Goal:
        """Overwrites the key_results milestones structure and updates progress metrics."""
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise ValueError("Goal not found.")

        goal.key_results = {"milestones": milestones}
        self.db.commit()
        
        # Recalculate progress
        self.update_goal_progress(goal_id)
        return goal

    async def trigger_lagging_reminders(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Identifies any active goals projected to finish late and schedules highly contextual
        smart reminders inside the alerts database tables.
        """
        active_goals = self.db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.status.in_(["active", "delayed"])
        ).all()

        reminders_created = []
        reminder_service = SmartReminderService(self.db)
        
        for goal in active_goals:
            projected = await self.predict_deadline(goal.id)
            if not projected:
                continue

            target_date = goal.target_date
            if target_date.tzinfo is None:
                target_date = target_date.replace(tzinfo=timezone.utc)

            if projected > target_date:
                delay_days = (projected - target_date).days
                content = f"Lagging Alert: Goal '{goal.title}' is currently projected {delay_days} days late. Schedule a Pomodoro focus block to catch up!"
                
                # Check duplicate alert for today to avoid spamming
                dup = self.db.query(Reminder).filter(
                    Reminder.user_id == user_id,
                    Reminder.content.like(f"%'{goal.title}'%"),
                    Reminder.status == "active"
                ).first()

                if not dup:
                    rem = await reminder_service.create_smart_reminder(
                        user_id=user_id,
                        content=content,
                        due_at=datetime.now(timezone.utc) + timedelta(hours=2),
                        importance=8,
                        category="Pacing Alert",
                        is_predicted=True
                    )
                    reminders_created.append({
                        "goal_id": goal.id,
                        "reminder_id": rem.id,
                        "content": content
                    })

        return reminders_created

    async def get_goals_analytics(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Compiles advanced goal success indices, types distributions, and velocities."""
        goals = self.db.query(Goal).filter(Goal.user_id == user_id).all()
        
        total = len(goals)
        if total == 0:
            return {
                "total_goals": 0,
                "short_term_count": 0,
                "long_term_count": 0,
                "average_progress": 0.0,
                "deadline_compliance_ratio": 1.0,
                "delayed_goals": []
            }

        short_term = sum(1 for g in goals if g.goal_type == "short_term")
        long_term = sum(1 for g in goals if g.goal_type == "long_term")
        avg_progress = sum(g.completion_percentage for g in goals) / total

        delayed_goals = []
        compliant_count = 0
        
        for g in goals:
            if g.status == "completed":
                compliant_count += 1
                continue
                
            projected = g.projected_completion_date
            if not projected:
                # Trigger forecast updates
                projected = await self.predict_deadline(g.id)
                
            if projected:
                target_date = g.target_date
                if target_date.tzinfo is None:
                    target_date = target_date.replace(tzinfo=timezone.utc)
                if projected <= target_date:
                    compliant_count += 1
                else:
                    delayed_goals.append({
                        "id": g.id,
                        "title": g.title,
                        "goal_type": g.goal_type,
                        "completion_percentage": g.completion_percentage,
                        "target_date": g.target_date,
                        "projected_date": projected
                    })
            else:
                compliant_count += 1

        compliance_ratio = round(compliant_count / total, 2)

        return {
            "total_goals": total,
            "short_term_count": short_term,
            "long_term_count": long_term,
            "average_progress": round(avg_progress, 2),
            "deadline_compliance_ratio": compliance_ratio,
            "delayed_goals": delayed_goals
        }
