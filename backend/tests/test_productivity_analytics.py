"""
Unit and integration tests for Cognitive OS Productivity Analytics Dashboard Engine.
Validates telemetry ingestion, focus cycles, milestone completions, and multi-agent integrations.
"""
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.domain import User, Goal, FocusSession, ProductivityLog, AIRecommendation, TaskHistory
from app.services.analytics import ProductivityAnalyticsService

@pytest.fixture(scope="function")
def test_user(db_session: Session) -> User:
    """Yields a registered developer user context."""
    user = User(
        id=uuid.UUID("d159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf"),
        email="analytics_dev@cognitive-os.com",
        hashed_password="secure_password",
        role="user",
        name="Developer User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.mark.asyncio
async def test_telemetry_ingestion_and_fatigue_heuristics(db_session: Session, test_user: User):
    """Verifies telemetry packaging, key variance parsing, and fatigue scoring."""
    service = ProductivityAnalyticsService(db_session)
    
    # Test case 1: Low active switches, productive environment
    record1 = await service.record_telemetry(
        user_id=test_user.id,
        active_application="VS Code",
        window_title="analytics.py",
        app_switch_count=2,
        keystroke_count=150,
        keystroke_average_gap_ms=210.0,
        mouse_scroll_pixels=400,
        is_distracting=False
    )
    
    assert record1.id is not None
    # Fatigue should be relatively low for focused active sessions
    assert record1.fatigue_index < 0.4
    assert record1.keystroke_jitter < 0.1
    assert record1.distraction_ratio == 0.0
    
    # Test case 2: Heavy distraction app context switches and delay delays
    record2 = await service.record_telemetry(
        user_id=test_user.id,
        active_application="Chrome",
        window_title="Twitter / X",
        app_switch_count=18,
        keystroke_count=45,
        keystroke_average_gap_ms=850.0, # Slow laggy responses representing exhaustion/loss of focus
        mouse_scroll_pixels=1800,
        is_distracting=True
    )
    
    assert record2.fatigue_index > 0.6 # High fatigue index score
    assert record2.distraction_ratio == 1.0

@pytest.mark.asyncio
async def test_goals_lifecycle_and_focus_timers(db_session: Session, test_user: User):
    """Verifies goal settings, Pomodoro active duration triggers, and dynamic goal updates."""
    service = ProductivityAnalyticsService(db_session)
    
    # 1. Create a productivity target
    target_date = datetime.now(timezone.utc) + timedelta(days=5)
    goal = await service.create_goal(
        user_id=test_user.id,
        title="Implement Analytics Dashboard Router",
        description="Write complete working REST APIs and endpoints",
        target_date=target_date,
        key_results={"milestones": [{"step": "Define schema", "done": False}]}
    )
    
    assert goal.id is not None
    assert goal.completion_percentage == 0.0
    assert goal.status == "active"
    
    # 2. Start Pomodoro focus session cycle
    session = await service.start_focus_session(user_id=test_user.id, goal_id=goal.id)
    assert session.id is not None
    assert session.flow_state_score == 1.0
    assert session.duration_seconds == 0
    
    # 3. Simulate focus duration completion with few distractions
    # We patch end duration calculations directly for simulation consistency
    session_ended = await service.end_focus_session(
        session_id=session.id,
        interruption_count=1,
        context_switch_count=3
    )
    
    assert session_ended.ended_at is not None
    # Flow score deductions: (1 * 0.1) + (3 * 0.05) = 0.25 -> 1.0 - 0.25 = 0.75
    assert session_ended.flow_state_score == 0.75
    
    # Verify linked goal completion increased dynamically
    db_session.refresh(goal)
    assert goal.completion_percentage == 5.0

@pytest.mark.asyncio
async def test_dashboard_hydration_and_recs_execution(db_session: Session, test_user: User):
    """Verifies snapshot hydration aggregation layers and delegation actions execution."""
    service = ProductivityAnalyticsService(db_session)
    
    # Pre-populate focus sessions to index summaries
    s1 = FocusSession(
        user_id=test_user.id,
        started_at=datetime.now(timezone.utc) - timedelta(hours=5),
        ended_at=datetime.now(timezone.utc) - timedelta(hours=1),
        duration_seconds=14400,
        interruption_count=0,
        context_switch_count=0,
        flow_state_score=1.0
    )
    
    # Pre-populate recommendations
    rec = AIRecommendation(
        user_id=test_user.id,
        title="Resolve tab switches in Chrome",
        category="focus",
        description="High context switches detected during workspace codings.",
        priority_score=0.94,
        is_actionable=True,
        action_payload={"workflow": "minimize_tab_switching"},
        status="pending"
    )
    
    db_session.add(s1)
    db_session.add(rec)
    db_session.commit()
    
    # Fetch dashboard data
    dashboard = await service.get_hydrated_dashboard(user_id=test_user.id, days=7)
    
    assert dashboard["overview"]["total_focus_hours"] == 4.0
    assert dashboard["overview"]["average_flow_score"] == 1.0
    assert len(dashboard["recommendations"]) >= 1
    assert dashboard["recommendations"][0]["priority_score"] == 0.94
    
    # Trigger recommendation execution delegation
    execution_report = await service.execute_recommendation(
        user_id=test_user.id,
        recommendation_id=rec.id
    )
    
    assert execution_report["status"] == "executed"
    assert execution_report["payload"]["workflow"] == "minimize_tab_switching"
    
    # Confirm DB updated
    db_session.refresh(rec)
    assert rec.status == "executed"

def test_api_routes_end_to_end(client: TestClient, db_session: Session, test_user: User):
    """End-to-End: Verifies response parsing states and OAuth client validation routers."""
    # We patch dependencies in conftest to return our active test_user context
    # Let's post telemetry data directly via standard HTTP REST requests
    telemetry_data = {
        "active_application": "VS Code",
        "window_title": "test_productivity_analytics.py",
        "app_switch_count": 3,
        "keystroke_count": 84,
        "keystroke_average_gap_ms": 202.4,
        "mouse_scroll_pixels": 820,
        "is_distracting": False
    }
    
    # Patch oauth validation to return current user
    from app.api.deps import get_current_user
    def mock_get_current_user():
        return test_user
    client.app.dependency_overrides[get_current_user] = mock_get_current_user
    
    response = client.post("/api/v1/analytics/telemetry", json=telemetry_data)
    assert response.status_code == 202
    assert "fatigue_index" in response.json()
    
    # Fetch hydrated dashboard snapshot
    dash_response = client.get("/api/v1/analytics/dashboard?days=7")
    assert dash_response.status_code == 200
    assert "overview" in dash_response.json()
    
    # Create goal target
    goal_data = {
        "title": "Complete VC Sprint Deliverables",
        "description": "Ensure zero active lint or system validation errors",
        "target_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "key_results": {"steps": []}
    }
    goal_response = client.post("/api/v1/analytics/goals", json=goal_data)
    assert goal_response.status_code == 201
    assert "id" in goal_response.json()
    
    # Test generation API route
    gen_response = client.post("/api/v1/analytics/reports/generate?days=7")
    assert gen_response.status_code == 200
    report_data = gen_response.json()
    assert "markdown_content" in report_data
    assert "metrics_summary" in report_data
    
    # Test retrieval API route
    rec_response = client.get("/api/v1/analytics/reports/recent")
    assert rec_response.status_code == 200
    assert rec_response.json()["id"] == report_data["id"]

    client.app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_gather_behavioral_context_pipeline(db_session: Session, test_user: User):
    """Verifies service correctly serializes PostgreSQL active database states."""
    service = ProductivityAnalyticsService(db_session)
    
    # Pre-populate dummy focus session
    s1 = FocusSession(
        user_id=test_user.id,
        started_at=datetime.now(timezone.utc) - timedelta(hours=2),
        ended_at=datetime.now(timezone.utc) - timedelta(hours=1),
        duration_seconds=3600,
        interruption_count=1,
        context_switch_count=2,
        flow_state_score=0.8
    )
    db_session.add(s1)
    db_session.commit()
    
    context = await service.gather_behavioral_context(test_user.id, days=7)
    assert "overview_scores" in context
    assert "telemetry_summary" in context
    assert "completed_tasks_metrics" in context
    assert len(context["focus_trend"]) >= 1

