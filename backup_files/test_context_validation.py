import asyncio
import logging
import pytest
from pydantic import ValidationError

from app.orchestration.bus import EventBus, AgentMessage, EventContext, AgentStatus

logger = logging.getLogger(__name__)

@pytest.fixture
def event_bus():
    """Provides a clean EventBus instance for each test."""
    return EventBus()

# ============================================================================
# 1. Validation Logic
# ============================================================================

def validate_context_propagation(original: EventContext, received: EventContext):
    """
    Validation Logic:
    Ensures that context object remains unmodified and perfectly synchronized
    across multi-agent hops.
    """
    assert original.trace_id == received.trace_id, "Trace ID mismatch! Context linkage broken."
    assert original.user_id == received.user_id, "User ID lost during context passing."
    assert original.session_id == received.session_id, "Session ID lost during context passing."
    for k, v in original.shared_state.items():
        assert received.shared_state.get(k) == v, f"Shared state key '{k}' mutated or missing."

# ============================================================================
# 2. Automated Tests & Sample Workflows
# ============================================================================

@pytest.mark.asyncio
async def test_workflow_continuity(event_bus):
    """
    Sample Workflow Test:
    Validates Agent A -> Agent B -> Agent C continuity.
    Ensures context and trace ID propagate completely to the end.
    """
    await event_bus.start()
    
    # Store received contexts to validate outside the callbacks
    contexts = {}

    # Agent C logic (Terminal node)
    async def agent_c_handler(msg: AgentMessage):
        contexts["C"] = msg.context
        # Validate that the shared state added by B reached C
        assert msg.context.shared_state.get("b_status") == "processed"
        logger.info(f"Agent C received trace_id {msg.context.trace_id}")

    # Agent B logic (Intermediate node)
    async def agent_b_handler(msg: AgentMessage):
        contexts["B"] = msg.context
        
        # B modifies shared state, passing it forward
        new_context = msg.context.copy(deep=True)
        new_context.shared_state["b_status"] = "processed"
        
        msg_c = AgentMessage(
            topic="agent.c",
            sender="AgentB",
            payload={"action": "finalize"},
            context=new_context
        )
        await event_bus.publish(msg_c)
        logger.info(f"Agent B processed trace_id {msg.context.trace_id}")

    # Subscribe agents
    event_bus.subscribe("agent.b", agent_b_handler)
    event_bus.subscribe("agent.c", agent_c_handler)

    # Agent A (Origin node) creates initial context
    initial_context = EventContext(
        user_id="U001",
        session_id="S001",
        shared_state={"a_status": "started"}
    )
    
    msg_b = AgentMessage(
        topic="agent.b",
        sender="AgentA",
        payload={"action": "process"},
        context=initial_context
    )

    # Kick off the chain
    await event_bus.publish(msg_b)
    
    # Wait for the queue to drain completely (B finishes, queues C, C finishes)
    await event_bus._queue.join() 
    # Because B enqueues C during its execution, we might need a slight sleep to let the loop pick up C
    await asyncio.sleep(0.1)
    await event_bus._queue.join()

    # Validate propagation
    assert "B" in contexts, "Workflow failed to reach Agent B"
    assert "C" in contexts, "Workflow failed to reach Agent C"
    
    # Validate trace ID continuity
    assert contexts["B"].trace_id == initial_context.trace_id
    assert contexts["C"].trace_id == initial_context.trace_id
    
    await event_bus.stop()

@pytest.mark.asyncio
async def test_agent_state_synchronization(event_bus):
    """
    Validates that Agent Status monitors accurately track IDLE/WORKING
    during message processing.
    """
    await event_bus.start()
    
    # We use an event to freeze the agent mid-task so we can read its status
    freeze_event = asyncio.Event()

    async def long_running_agent(msg: AgentMessage):
        # We block here, agent status should be 'WORKING'
        await freeze_event.wait()

    event_bus.subscribe("agent.long", long_running_agent)

    msg = AgentMessage(topic="agent.long", sender="SlowAgent", payload={})
    
    # Publish and let the event loop pick it up
    await event_bus.publish(msg)
    await asyncio.sleep(0.05)
    
    # Assert agent is currently WORKING
    assert event_bus.monitor.get_status("SlowAgent") == AgentStatus.WORKING
    
    # Release the agent
    freeze_event.set()
    await event_bus._queue.join()
    
    # Assert agent reverted to IDLE
    assert event_bus.monitor.get_status("SlowAgent") == AgentStatus.IDLE

    await event_bus.stop()

@pytest.mark.asyncio
async def test_context_validation_schema(event_bus):
    """
    Validates that Pydantic enforces schema consistency.
    Invalid contexts must raise ValidationErrors immediately.
    """
    # Context must auto-generate a valid trace_id if none provided
    ctx = EventContext()
    assert ctx.trace_id is not None
    assert type(ctx.trace_id) is str

    # Attempting to force an invalid priority type should fail
    with pytest.raises(ValidationError):
        AgentMessage(
            topic="test",
            sender="AgentA",
            payload={},
            priority="INVALID_PRIORITY" # Should fail strict enum check
        )

# ============================================================================
# 3. Debugging Strategy (Documentation via Test Logic)
# ============================================================================
"""
Context Tracing & Debugging Strategy:

1. Global Trace ID (`context.trace_id`):
   When an API request starts, an EventContext is generated with a UUID4 `trace_id`.
   Search logs across *all* agents by filtering: `grep -r "trace_id=XYZ" logs/`

2. Orphaned Messages:
   If an agent crashes without throwing an exception to the EventBus, its status remains `WORKING`.
   The `StatusMonitor` should be scraped continuously. Any agent in `WORKING` for > 60s
   indicates a hung process (deadlock or unhandled I/O wait).

3. Shared State Bloat:
   `context.shared_state` is a dictionary. Large payloads (like vector embeddings) 
   should NOT be placed in `shared_state`. Instead, store a reference (e.g., `s3_key`)
   to prevent memory bloat inside the asyncio queue.

4. Poison Pill Detection:
   If `_execute_with_retry` maxes out (3 attempts), the agent state is flagged as `ERROR`.
   At this point, the EventBus logs a `CRITICAL` message. Alerts should be triggered on
   these log levels to isolate the corrupted message format.
"""
