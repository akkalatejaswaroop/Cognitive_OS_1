"""
Automation Analytics Engine — Cognitive OS.
Aggregates logs and history to generate efficiency insights and performance metrics.
"""
from __future__ import annotations

import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta, timezone

from app.engine.memory.context.automation_models import WorkflowHistory, AutomationLog

logger = logging.getLogger("analytics_engine")

class AutomationAnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_performance_snapshot(self, user_id: Any, days: int = 7) -> Dict[str, Any]:
        """
        Generates a high-level performance snapshot for the user's dashboard.
        """
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # 1. Basic Stats
        stats = self.db.query(
            func.count(WorkflowHistory.id).label("total"),
            func.count(case((WorkflowHistory.status == "completed", 1))).label("success"),
            func.count(case((WorkflowHistory.status == "failed", 1))).label("failed")
        ).filter(
            WorkflowHistory.user_id == user_id,
            WorkflowHistory.started_at >= since
        ).first()

        total = stats.total or 0
        success_rate = (stats.success / total * 100) if total > 0 else 0
        
        # 2. Agent Efficiency (Average duration per agent)
        agent_metrics = self.db.query(
            AutomationLog.agent_name,
            func.avg(func.extract('epoch', AutomationLog.created_at)).label("avg_duration") # Simplified for demo
        ).join(WorkflowHistory).filter(
            WorkflowHistory.user_id == user_id,
            WorkflowHistory.started_at >= since
        ).group_by(AutomationLog.agent_name).all()

        # 3. Token usage (Simulated based on log counts and workflow complexity)
        # In a real app, this would query a 'tokens' column in the logs.
        simulated_tokens = total * 1250 # Average tokens per multi-agent DAG run

        return {
            "overview": {
                "total_runs": total,
                "success_rate": round(success_rate, 2),
                "failure_count": stats.failed or 0,
                "estimated_tokens_saved": simulated_tokens
            },
            "agent_performance": [
                {"agent": m.agent_name, "avg_time_ms": 1200} # Mock data for ms consistency
                for m in agent_metrics
            ],
            "insights": self._generate_ai_insights(total, success_rate)
        }

    def _generate_ai_insights(self, total: int, success_rate: float) -> List[str]:
        """Heuristic-based insights (to be eventually replaced by LLM summary)."""
        insights = []
        if success_rate < 85:
            insights.append("Reliability Alert: Some DAG branches are failing. Check the 'Research' agent for timeout issues.")
        if total > 50:
            insights.append("Efficiency Win: You've automated over 50 cognitive cycles this week.")
        return insights
