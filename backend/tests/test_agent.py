import pytest
from app.orchestration.bus import event_bus

def test_execute_agent_task_unauthenticated(client):
    # Call without login / cookies
    response = client.post(
        "/api/v1/agent/execute",
        json={"task": "Help me write tests"}
    )
    assert response.status_code == 401

def test_execute_agent_task_success(client):
    # 1. Sign up and Login to establish auth cookies in the client session
    client.post(
        "/api/v1/auth/signup",
        json={"email": "agentuser@example.com", "password": "securepassword123"}
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "agentuser@example.com", "password": "securepassword123"}
    )
    assert login_response.status_code == 200

    # 2. Clear any prior events in the queue for a clean test
    while not event_bus._queue.empty():
        event_bus._queue.get_nowait()

    # 3. Call execution endpoint
    task_payload = {"task": "Write a python script to count to 10"}
    response = client.post(
        "/api/v1/agent/execute",
        json=task_payload
    )
    
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert "task_id" in res_data
    assert res_data["message"] == "Task dispatched to Supervisor Agent."

    # 4. Verify that the event was correctly published to the event bus
    assert not event_bus._queue.empty()
    _, queued_event = event_bus._queue.get_nowait()
    assert queued_event.topic == "agent.supervisor"
    assert queued_event.payload["task"] == task_payload["task"]
    assert queued_event.payload["task_id"] == res_data["task_id"]

@pytest.mark.asyncio
async def test_supervisor_swarm_delegation():
    # Instantiate agents directly to test orchestration logic in isolation
    from app.engine.agents.supervisor import SupervisorAgent
    from app.engine.agents.coder import CoderAgent
    from app.orchestration.bus import event_bus
    
    # Ensure event bus is running
    if event_bus._task is None or event_bus._task.done():
        await event_bus.start()
    
    # Keep agent references so subscriptions are active
    supervisor = SupervisorAgent()
    coder = CoderAgent()
    
    task = "Write a python script to count to 10"
    task_id = "test-task-swarm"
    
    # Run supervisor execution
    result = await supervisor.execute(task, task_id=task_id)
    
    # Verify result contains coder agent's implementation or fallback structure
    assert "Coder Agent" in result or "coder-agent" in result
    assert "solve_task" in result or "count to 10" in result

