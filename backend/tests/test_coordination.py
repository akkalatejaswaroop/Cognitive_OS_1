import asyncio
import pytest
from unittest.mock import AsyncMock, patch

from app.orchestration.bus import EventBus, AgentMessage, EventContext, MessagePriority, AgentStatus

@pytest.fixture
def event_bus():
    """Provides a clean EventBus instance for each test."""
    bus = EventBus()
    # Don't auto-start here so tests can control the lifecycle
    return bus

@pytest.mark.asyncio
async def test_multi_agent_communication(event_bus):
    """Test 1: Multi-agent communication & routing"""
    await event_bus.start()
    
    mock_callback = AsyncMock()
    event_bus.subscribe("test.topic", mock_callback)
    
    msg = AgentMessage(
        topic="test.topic",
        sender="AgentA",
        payload={"data": "hello"}
    )
    
    await event_bus.publish(msg)
    await asyncio.sleep(0.1) # allow queue to process
    
    mock_callback.assert_called_once_with(msg)
    await event_bus.stop()

@pytest.mark.asyncio
async def test_context_passing(event_bus):
    """Test 2: Context passing & synchronization"""
    await event_bus.start()
    
    received_context = None
    async def capture_context(msg: AgentMessage):
        nonlocal received_context
        received_context = msg.context

    event_bus.subscribe("context.topic", capture_context)
    
    context = EventContext(user_id="user1", session_id="session1", shared_state={"key": "value"})
    msg = AgentMessage(topic="context.topic", sender="AgentA", payload={}, context=context)
    
    await event_bus.publish(msg)
    await asyncio.sleep(0.1)
    
    assert received_context is not None
    assert received_context.user_id == "user1"
    assert received_context.shared_state["key"] == "value"
    await event_bus.stop()

@pytest.mark.asyncio
async def test_parallel_execution(event_bus):
    """Test 3: Parallel execution of multiple subscribers"""
    await event_bus.start()
    
    # We want to ensure multiple callbacks run concurrently
    start_time = asyncio.get_event_loop().time()
    
    async def slow_callback1(msg):
        await asyncio.sleep(0.2)
        
    async def slow_callback2(msg):
        await asyncio.sleep(0.2)

    event_bus.subscribe("parallel.topic", slow_callback1)
    event_bus.subscribe("parallel.topic", slow_callback2)
    
    msg = AgentMessage(topic="parallel.topic", sender="AgentA", payload={})
    await event_bus.publish(msg)
    
    # Wait until the queue is empty
    await event_bus._queue.join()
    
    end_time = asyncio.get_event_loop().time()
    duration = end_time - start_time
    
    # If they run sequentially, it takes 0.4s. If parallel, ~0.2s.
    assert duration < 0.35, f"Callbacks did not execute in parallel, took {duration}s"
    await event_bus.stop()

@pytest.mark.asyncio
async def test_timeout_handling(event_bus):
    """Test 4: Timeout handling on slow agents"""
    # Note: EventBus itself doesn't strictly timeout callbacks, but agents do.
    # We simulate a timeout wrapped in a task.
    await event_bus.start()
    
    async def hanging_callback(msg):
        await asyncio.sleep(10)
        
    event_bus.subscribe("timeout.topic", hanging_callback)
    
    msg = AgentMessage(topic="timeout.topic", sender="AgentA", payload={})
    await event_bus.publish(msg)
    
    # Simulate an orchestrator waiting with a timeout
    try:
        await asyncio.wait_for(event_bus._queue.join(), timeout=0.1)
        assert False, "Should have timed out"
    except asyncio.TimeoutError:
        pass # Expected behavior

    await event_bus.stop()

@pytest.mark.asyncio
async def test_retry_mechanism(event_bus):
    """Test 5: Retry mechanism and fault tolerance"""
    await event_bus.start()
    
    call_count = 0
    async def failing_callback(msg):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ValueError("Simulated failure")
    
    event_bus.subscribe("retry.topic", failing_callback)
    
    msg = AgentMessage(topic="retry.topic", sender="AgentA", payload={})
    
    # The EventBus _process_events executes callbacks via _execute_with_retry
    # We patch asyncio.sleep to avoid waiting for the exponential backoff during tests
    with patch("asyncio.sleep", new_callable=AsyncMock):
        await event_bus.publish(msg)
        await event_bus._queue.join()
    
    assert call_count == 3, "Callback should be retried upon failure"
    assert event_bus.monitor.get_status("AgentA") == AgentStatus.IDLE
    await event_bus.stop()

@pytest.mark.asyncio
async def test_memory_consistency(event_bus):
    """Test 6: Memory consistency across agents"""
    await event_bus.start()
    
    shared_memory = {}
    
    async def agent_writer(msg):
        shared_memory[msg.payload["key"]] = msg.payload["val"]
        
    async def agent_reader(msg):
        # verifies memory was written
        assert shared_memory.get(msg.payload["key"]) == msg.payload["val"]
        
    event_bus.subscribe("memory.write", agent_writer)
    event_bus.subscribe("memory.read", agent_reader)
    
    write_msg = AgentMessage(topic="memory.write", sender="AgentA", payload={"key": "status", "val": "completed"})
    read_msg = AgentMessage(topic="memory.read", sender="AgentB", payload={"key": "status", "val": "completed"})
    
    await event_bus.publish(write_msg)
    await event_bus._queue.join() # wait for write
    
    await event_bus.publish(read_msg)
    await event_bus._queue.join() # wait for read
    
    assert shared_memory["status"] == "completed"
    await event_bus.stop()
