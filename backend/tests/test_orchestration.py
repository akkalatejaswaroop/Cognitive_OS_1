"""
Unit tests for orchestration components: circuit breaker, retry, and task graph.
"""
import asyncio
import pytest
from datetime import datetime, timezone, timedelta

from app.orchestration.circuit_breaker import CircuitBreaker, CBState
from app.orchestration.retry import exponential_backoff


# ── CircuitBreaker tests ──────────────────────────────────────────────────────

class TestCircuitBreaker:
    def test_starts_closed(self):
        cb = CircuitBreaker("test-agent", failure_threshold=3, reset_timeout_s=30)
        assert cb.state == CBState.CLOSED

    def test_opens_after_threshold(self):
        cb = CircuitBreaker("test-agent", failure_threshold=3, reset_timeout_s=30)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CBState.CLOSED   # not yet at threshold
        cb.record_failure()
        assert cb.state == CBState.OPEN

    def test_is_open_returns_true_when_open(self):
        cb = CircuitBreaker("test-agent", failure_threshold=1, reset_timeout_s=30)
        cb.record_failure()
        assert cb.is_open() is True

    def test_closes_on_success_from_half_open(self):
        cb = CircuitBreaker("test-agent", failure_threshold=1, reset_timeout_s=0)
        cb.record_failure()       # → OPEN
        # Force transition to HALF_OPEN by backdating last_failure
        cb._last_failure_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        assert cb.state == CBState.HALF_OPEN
        cb.record_success()
        assert cb.state == CBState.CLOSED

    def test_reopens_on_failure_from_half_open(self):
        cb = CircuitBreaker("test-agent", failure_threshold=1, reset_timeout_s=0)
        cb.record_failure()       # -> OPEN
        # Backdate last_failure so the OPEN -> HALF_OPEN transition fires on next .state read
        cb._last_failure_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        # Verify it transitions to HALF_OPEN on the first read
        assert cb.state == CBState.HALF_OPEN
        # Second failure while in HALF_OPEN should re-open the circuit.
        # record_failure() sets _state to OPEN directly (see HALF_OPEN branch).
        cb.record_failure()
        # Do NOT call cb.state here — that would trigger _maybe_transition_to_half_open again.
        # Inspect _state directly to avoid the re-transition.
        assert cb._state == CBState.OPEN

    def test_to_dict_structure(self):
        cb = CircuitBreaker("my-agent", failure_threshold=3, reset_timeout_s=30)
        d = cb.to_dict()
        assert d["name"] == "my-agent"
        assert "state" in d
        assert "failure_count" in d


# ── Retry tests ───────────────────────────────────────────────────────────────

class TestExponentialBackoff:
    @pytest.mark.asyncio
    async def test_succeeds_on_first_try(self):
        call_count = 0

        async def fn():
            nonlocal call_count
            call_count += 1
            return "ok"

        result = await exponential_backoff(fn, max_retries=3, label="test")
        assert result == "ok"
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_retries_on_failure_then_succeeds(self):
        attempts = []

        async def fn():
            attempts.append(1)
            if len(attempts) < 3:
                raise ValueError("not yet")
            return "done"

        # Patch asyncio.sleep to avoid actual waiting during tests
        async def noop_sleep(_):
            pass

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("asyncio.sleep", noop_sleep)
            result = await exponential_backoff(fn, max_retries=3, base_delay_s=0.001, label="t")
        assert result == "done"
        assert len(attempts) == 3

    @pytest.mark.asyncio
    async def test_raises_after_max_retries(self):
        async def always_fails():
            raise RuntimeError("always fails")

        with pytest.raises(RuntimeError, match="always fails"):
            await exponential_backoff(
                always_fails, max_retries=2, base_delay_s=0.0, label="t"
            )


# ── TaskGraph tests ───────────────────────────────────────────────────────────

class TestTaskGraphRunner:
    @pytest.mark.asyncio
    async def test_runs_independent_tasks_in_parallel(self):
        from app.schemas.agent import SubTask, TaskGraph
        from app.orchestration.task_graph import TaskGraphRunner
        import uuid

        parent_id = str(uuid.uuid4())
        t1_id = str(uuid.uuid4())
        t2_id = str(uuid.uuid4())

        graph = TaskGraph(
            task_id=parent_id,
            subtasks=[
                SubTask(sub_task_id=t1_id, parent_task_id=parent_id, agent="research-agent",
                        description="task1", depends_on=[]),
                SubTask(sub_task_id=t2_id, parent_task_id=parent_id, agent="execution-agent",
                        description="task2", depends_on=[]),
            ],
        )

        async def fake_delegate(st: SubTask) -> str:
            return f"result:{st.sub_task_id}"

        runner = TaskGraphRunner(graph=graph, delegate_fn=fake_delegate)
        results = await runner.run()

        assert results[t1_id] == f"result:{t1_id}"
        assert results[t2_id] == f"result:{t2_id}"

    @pytest.mark.asyncio
    async def test_dependent_task_skipped_when_predecessor_fails(self):
        from app.schemas.agent import SubTask, TaskGraph
        from app.orchestration.task_graph import TaskGraphRunner
        import uuid

        parent_id = str(uuid.uuid4())
        t1_id = str(uuid.uuid4())
        t2_id = str(uuid.uuid4())

        graph = TaskGraph(
            task_id=parent_id,
            subtasks=[
                SubTask(sub_task_id=t1_id, parent_task_id=parent_id, agent="research-agent",
                        description="failing task", depends_on=[]),
                SubTask(sub_task_id=t2_id, parent_task_id=parent_id, agent="summary-agent",
                        description="dependent task", depends_on=[t1_id]),
            ],
        )

        async def fake_delegate(st: SubTask) -> str:
            if st.sub_task_id == t1_id:
                raise Exception("task1 failed")
            return "task2 result"

        runner = TaskGraphRunner(graph=graph, delegate_fn=fake_delegate)
        results = await runner.run()

        # t2 should be skipped, not executed
        assert t2_id not in results or "ERROR" in str(results.get(t2_id, ""))
