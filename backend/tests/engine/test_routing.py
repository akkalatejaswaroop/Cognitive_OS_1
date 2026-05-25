import pytest
from app.engine.router.core import AIWorkflowRouter
from app.engine.router.schema import WorkflowType

@pytest.mark.asyncio
async def test_workflow_routing_heuristics():
    router = AIWorkflowRouter()
    
    # Test cases for heuristic (fast-path) matches
    test_cases = [
        ("summarize the meeting", WorkflowType.MEETING_SUMMARY),
        ("draft an email to boss", WorkflowType.EMAIL_DRAFT),
        ("remind me at 5pm", WorkflowType.REMINDER),
        ("what did i say about the project?", WorkflowType.MEMORY_RECALL),
        ("schedule a call", WorkflowType.CALENDAR),
        ("research generative ai", WorkflowType.RESEARCH),
    ]
    
    for task, expected_type in test_cases:
        route = await router.route(task)
        assert route.workflow_type == expected_type, f"Failed to route '{task}' to {expected_type}"

@pytest.mark.asyncio
async def test_workflow_routing_semantic():
    router = AIWorkflowRouter()
    
    # Ambiguous cases that require LLM reasoning
    ambiguous_task = "Analyze my last week's performance and suggest improvements."
    route = await router.route(ambiguous_task)
    
    # Analytics or Research is acceptable here
    assert route.workflow_type in [WorkflowType.ANALYTICS, WorkflowType.RESEARCH]
    assert route.priority >= 1 and route.priority <= 5
