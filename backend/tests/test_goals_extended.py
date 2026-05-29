"""
Integration and unit tests for the extended Goal Tracking System of Cognitive OS.
Validates hierarchical parent links, AI milestones, deadline forecasts, and REST endpoints.
"""
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.domain import User, Goal, FocusSession, TaskHistory
from app.engine.memory.context.automation_models import Reminder
from app.services.goal import GoalTrackingService

@pytest.fixture(scope="function")
def test_user(db_session: Session) -> User:
    """Yields a registered test user context."""
    user = User(
        id=uuid.UUID("d159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf"),
        email="goal_tracking_dev@cognitive-os.com",
        hashed_password="secure_password",
        role="user",
        name="Sarah Jenkins",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.mark.asyncio
async def test_goal_creation_and_hierarchical_relationships(db_session: Session, test_user: User):
    """Verifies short-term/long-term goal links and parenting queries."""
    service = GoalTrackingService(db_session)
    
    # 1. Create a parent Long-term goal
    parent = await service.create_goal(
        user_id=test_user.id,
        title="Launch Cognitive OS SaaS",
        description="Core investor deployment sequence",
        target_date=datetime.now(timezone.utc) + timedelta(days=60),
        goal_type="long_term"
    )
    
    assert parent.id is not None
    assert parent.goal_type == "long_term"
    
    # 2. Create sub short-term goals linked to the parent
    sub_goal = await service.create_goal(
        user_id=test_user.id,
        title="Setup Swagger routes and DB schemas",
        description="Milestone 1 deliverables",
        target_date=datetime.now(timezone.utc) + timedelta(days=5),
        goal_type="short_term",
        parent_goal_id=parent.id
    )
    
    assert sub_goal.id is not None
    assert sub_goal.goal_type == "short_term"
    assert sub_goal.parent_goal_id == parent.id
    
    # 3. Query parent relationship
    db_session.refresh(parent)
    assert len(parent.sub_goals) == 1
    assert parent.sub_goals[0].id == sub_goal.id

@pytest.mark.asyncio
async def test_completion_rates_and_velocity_deadline_forecasts(db_session: Session, test_user: User):
    """Verifies dynamic progress math calculations and timeline projections."""
    service = GoalTrackingService(db_session)
    
    # Create goal with milestones
    goal = await service.create_goal(
        user_id=test_user.id,
        title="Integrate Swarm telemetry metrics",
        description="Core data collection logs",
        target_date=datetime.now(timezone.utc) + timedelta(days=10),
        goal_type="short_term",
        key_results={
            "milestones": [
                {"step": "Setup logger", "done": True},
                {"step": "Setup DB tables", "done": False},
                {"step": "Setup REST routes", "done": False}
            ]
        }
    )
    
    # 1. Progress calculation
    progress = service.update_goal_progress(goal.id)
    assert progress == 33.33 # 1 of 3 completed
    
    # 2. Focus duration logged to represent focus speed
    focus = FocusSession(
        user_id=test_user.id,
        goal_id=goal.id,
        started_at=datetime.now(timezone.utc) - timedelta(hours=2),
        ended_at=datetime.now(timezone.utc),
        duration_seconds=7200, # 2 hours
        interruption_count=0,
        context_switch_count=1,
        flow_state_score=0.9
    )
    db_session.add(focus)
    db_session.commit()
    
    # 3. Predict deadline based on velocity
    projected = await service.predict_deadline(goal.id)
    assert projected is not None
    # Safe comparison: SQLite removes tzinfo when storing datetimes
    g_date = goal.projected_completion_date.replace(tzinfo=None) if goal.projected_completion_date else None
    p_date = projected.replace(tzinfo=None) if projected else None
    assert g_date == p_date

    
    # Under current focus velocity (33.33% / 2 hours = 16.66% per hour),
    # 66.66% remaining will take 4 focus hours. With a default daily focus average
    # of 2 hours, it requires exactly 2 calendar days, which easily matches target_date (4 days)!
    assert goal.status != "delayed"

@pytest.mark.asyncio
async def test_smart_lagging_reminders_trigger(db_session: Session, test_user: User):
    """Verifies that the service triggers smart reminders when goals are projected late."""
    service = GoalTrackingService(db_session)
    
    # Create a goal that is due tomorrow (1 day)
    goal = await service.create_goal(
        user_id=test_user.id,
        title="VC presentation deck reviews",
        description="Verify analytics scores",
        target_date=datetime.now(timezone.utc) + timedelta(days=1),
        goal_type="short_term",
        key_results={
            "milestones": [
                {"step": "Draft review", "done": False},
                {"step": "Finalize styles", "done": False}
            ]
        }
    )
    
    # Log focus session with extremely slow progress velocity to force a late prediction
    focus = FocusSession(
        user_id=test_user.id,
        goal_id=goal.id,
        started_at=datetime.now(timezone.utc) - timedelta(hours=10),
        ended_at=datetime.now(timezone.utc),
        duration_seconds=36000, # 10 hours spent with 0% progress!
        interruption_count=0,
        context_switch_count=0,
        flow_state_score=1.0
    )
    db_session.add(focus)
    db_session.commit()
    
    # Trigger smart reminders
    reminders = await service.trigger_lagging_reminders(test_user.id)
    assert len(reminders) >= 1
    assert reminders[0]["goal_id"] == goal.id
    
    # Verify Reminder was persisted in the db
    rem_db = db_session.query(Reminder).filter(Reminder.id == reminders[0]["reminder_id"]).first()
    assert rem_db is not None
    assert "Lagging Alert:" in rem_db.content

def test_goal_tracking_endpoints_end_to_end(client: TestClient, db_session: Session, test_user: User):
    """E2E: Verifies API router endpoint lifecycles."""
    # Patch oauth validation to return current user
    from app.api.deps import get_current_user
    def mock_get_current_user():
        return test_user
    client.app.dependency_overrides[get_current_user] = mock_get_current_user
    
    # 1. Create hierarchical goal via REST
    goal_payload = {
        "title": "Complete Swagger API Router Sweep",
        "description": "REST endpoints verification DDL",
        "target_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        "goal_type": "short_term",
        "key_results": {"milestones": []}
    }
    
    response = client.post("/api/v1/analytics/goals", json=goal_payload)
    assert response.status_code == 201
    goal_data = response.json()
    assert goal_data["goal_type"] == "short_term"
    
    goal_id = goal_data["id"]
    
    # 2. Get AI proposed milestones
    suggest_res = client.post(f"/api/v1/analytics/goals/{goal_id}/milestones/suggest")
    assert suggest_res.status_code == 200
    suggestions = suggest_res.json()
    assert len(suggestions) >= 1
    
    # 3. Accept suggestions
    accept_payload = {
        "milestones": suggestions
    }
    accept_res = client.post(f"/api/v1/analytics/goals/{goal_id}/milestones/accept", json=accept_payload)
    assert accept_res.status_code == 200
    assert "key_results" in accept_res.json()
    
    # 4. Fetch analytics endpoint
    analytics_res = client.get("/api/v1/analytics/goals/analytics")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert "average_progress" in analytics_data
    
    client.app.dependency_overrides.clear()
