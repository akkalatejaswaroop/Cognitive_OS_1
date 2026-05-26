"""
Automation Analytics API — Cognitive OS.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.api.deps import get_current_user, get_db
from app.models.domain import User
from app.services.analytics import AutomationAnalyticsService

router = APIRouter(prefix="/analytics", tags=["Automation Analytics"])

@router.get("/snapshot")
async def get_analytics_snapshot(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns performance metrics and AI-driven insights for the dashboard.
    """
    service = AutomationAnalyticsService(db)
    return service.get_performance_snapshot(current_user.id, days)

@router.get("/tokens")
async def get_token_usage_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Detailed breakdown of token consumption per agent.
    """
    # Logic to breakdown tokens would go here
    return {"total_tokens": 124000, "by_agent": {"research": 85000, "execution": 20000, "planning": 19000}}
