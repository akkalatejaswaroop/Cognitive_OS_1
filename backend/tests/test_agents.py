"""
Unit tests for all six Cognitive OS agents.
Uses AsyncMock to isolate LLM calls and event bus side-effects.
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.engine.agents.planning_agent import PlanningAgent
from app.engine.agents.research import ResearchAgent

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_llm():
    """A mock LLM provider that returns a fixed string."""
    provider = AsyncMock()
    provider.generate = AsyncMock(return_value="mock LLM response")
    provider.embed = AsyncMock(return_value=[0.1] * 128)
    return provider


@pytest.fixture
def mock_event_bus():
    """A mock EventBus that no-ops publish/subscribe."""
    bus = MagicMock()
    bus.publish = AsyncMock()
    bus.subscribe = MagicMock()
    bus.unsubscribe = MagicMock()
    return bus


# ── MemoryAgent tests ─────────────────────────────────────────────────────────

class TestMemoryAgent:
    @pytest.mark.asyncio
    async def test_recall_returns_context(self, mock_llm):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch("app.llm.factory.get_llm_provider", return_value=mock_llm), \
             patch("app.core.database.chroma_client", None):  # ChromaDB offline

            from app.engine.agents.memory_agent import MemoryAgent
            agent = MemoryAgent()
            result = await agent.execute("RECALL:Python best practices", task_id="test-1")
            assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_store_without_chromadb(self, mock_llm):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch("app.llm.factory.get_llm_provider", return_value=mock_llm), \
             patch("app.core.database.chroma_client", None):

            from app.engine.agents.memory_agent import MemoryAgent
            agent = MemoryAgent()
            result = await agent.execute("STORE:User prefers Python", task_id="test-2")
            assert "unavailable" in result.lower() or "stored" in result.lower()


# ── PlanningAgent tests ───────────────────────────────────────────────────────

class TestPlanningAgent:
    @pytest.mark.asyncio
    async def test_returns_task_graph_json(self):
        from app.engine.agents.planning_agent import WorkflowPlan, SubTaskDef
        mock_plan_obj = WorkflowPlan(
            plan_objective="Test objective",
            subtasks=[
                SubTaskDef(step_id=1, description="Research FastAPI", agent="research", depends_on=[]),
                SubTaskDef(step_id=2, description="Generate code", agent="execution", depends_on=[1])
            ]
        )

        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch.object(PlanningAgent, "generate_plan", return_value=mock_plan_obj):

            agent = PlanningAgent()
            result = await agent.execute("Build a FastAPI app", task_id="test-plan-1")

            import json
            data = json.loads(result)
            assert "subtasks" in data
            assert len(data["subtasks"]) == 2

    @pytest.mark.asyncio
    async def test_fallback_on_bad_llm_output(self):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch.object(PlanningAgent, "generate_plan", return_value=None):

            agent = PlanningAgent()
            result = await agent.execute("Do something complex", task_id="test-plan-2")

            import json
            data = json.loads(result)
            # Should fallback to single research subtask
            assert len(data["subtasks"]) == 1
            assert data["subtasks"][0]["agent"] == "research-agent"


# ── ResearchAgent tests ───────────────────────────────────────────────────────

class TestResearchAgent:
    @pytest.mark.asyncio
    async def test_returns_research_output(self):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch.object(ResearchAgent, "execute_research", return_value="## Research Report\n\nKey findings...") as mock_exec:

            agent = ResearchAgent()
            result = await agent.execute("Explain async Python", task_id="test-res-1")
            assert "research" in result.lower() or "findings" in result.lower()
            mock_exec.assert_called_once_with("Explain async Python")

    @pytest.mark.asyncio
    async def test_fallback_on_llm_failure(self):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch.object(ResearchAgent, "execute_research", side_effect=RuntimeError("LLM down")):

            agent = ResearchAgent()

            # Should raise (retry logic will catch, but in test we call execute directly)
            with pytest.raises(RuntimeError):
                await agent.execute("Explain X", task_id="test-res-2")


# ── CoderAgent tests ──────────────────────────────────────────────────────────

class TestCoderAgent:
    @pytest.mark.asyncio
    async def test_code_generation(self):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch("app.services.llm.OllamaService.generate_response", new_callable=AsyncMock, return_value="```python\ndef hello():\n    pass\n```"):

            from app.engine.agents.coder import CoderAgent
            agent = CoderAgent()
            result = await agent.execute("Write a hello world function", task_id="test-exec-1")
            assert "python" in result.lower() or "def " in result


# ── ExecutionAgent tests ──────────────────────────────────────────────────────

class TestExecutionAgent:
    @pytest.mark.asyncio
    async def test_tool_invocation(self, mock_llm):
        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch("app.llm.factory.get_llm_provider", return_value=mock_llm), \
             patch("app.tools.registry.tool_registry.invoke", new_callable=AsyncMock,
                   return_value={"results": [], "answer": "test answer"}):

            from app.engine.agents.execution_agent import ExecutionAgent
            agent = ExecutionAgent()
            result = await agent.execute(
                'TOOL:web_search:{"query": "FastAPI docs"}', task_id="test-exec-2"
            )
            assert "web_search" in result or "Tool" in result


# ── SummaryAgent tests ────────────────────────────────────────────────────────

class TestSummaryAgent:
    @pytest.mark.asyncio
    async def test_distils_content(self, mock_llm):
        mock_llm.generate = AsyncMock(return_value="## Summary\n\nKey takeaway: FastAPI is excellent.")

        with patch("app.orchestration.bus.event_bus.subscribe"), \
             patch("app.orchestration.bus.event_bus.publish", new_callable=AsyncMock), \
             patch("app.llm.factory.get_llm_provider", return_value=mock_llm):

            from app.engine.agents.summary_agent import SummaryAgent
            agent = SummaryAgent()
            result = await agent.execute("Long content here…", task_id="test-sum-1")
            assert "summary" in result.lower() or "fastapi" in result.lower()
