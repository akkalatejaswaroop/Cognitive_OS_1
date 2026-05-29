import pytest
from app.engine.decision.engine import DecisionEngine

@pytest.mark.asyncio
async def test_decision_engine_prioritization():
    engine = DecisionEngine()
    
    # Urgent task should result in high priority
    task = "FIX CRITICAL SERVER ERROR IMMEDIATELY"
    memory = "Pinned Fact: Server uptime is top priority."
    profile = {"role": "SRE"}
    
    decision = await engine.evaluate(task, memory, profile)
    
    # Check if impact and urgency are high
    assert decision.selected_action.priority.impact >= 5
    assert decision.selected_action.priority.urgency >= 5
    assert decision.selected_action.priority.total_score >= 25
    assert decision.selected_action.agent_target == "execution-agent"

@pytest.mark.asyncio
async def test_decision_engine_fallback():
    engine = DecisionEngine()
    
    # Force the LLM generate call to throw an exception to test the fallback path safely
    from unittest.mock import AsyncMock, patch
    with patch.object(engine._llm, "generate", new_callable=AsyncMock, side_effect=Exception("LLM failure")):
        decision = await engine.evaluate("", "", {})
    
    assert decision.selected_action.action_id == "fallback"
    assert decision.context_confidence == 0.0
