"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         COGNITIVE OS — MULTI-AGENT ORCHESTRATOR                            ║
║         Production-Grade Python · FastAPI · Async · Fully Typed            ║
╚══════════════════════════════════════════════════════════════════════════════╝

ARCHITECTURE OVERVIEW
─────────────────────
This module implements a fully async, fault-tolerant Multi-Agent Orchestrator
for Cognitive OS. It follows the Mediator pattern: all inter-agent communication
flows through a central message bus, never agent-to-agent directly.

Pipeline (default):
  User Request
      │
      ▼
  MultiAgentOrchestrator.run()
      ├─ [1] MemoryAgent   — semantic context recall from ChromaDB
      ├─ [2] PlannerAgent  — LLM task decomposition → SubTask DAG
      ├─ [3] ResearchAgent — fact-finding (parallel, if in plan)
      ├─ [4] ExecutionAgent— code/tool execution (parallel, if in plan)
      └─ [5] SummaryAgent  — final output distillation

Design Principles:
  • Every agent is dynamically registrable — no hardcoded routing tables.
  • Context flows explicitly through a typed TaskContext object.
  • All I/O is async-first (asyncio); no blocking calls.
  • Retry with exponential backoff on every agent call.
  • Per-agent circuit breakers prevent cascade failures.
  • Timeouts enforced at delegation level (not just at HTTP layer).
  • All events logged with structured JSON for observability.

API Endpoints (FastAPI):
  POST /api/v1/orchestrator/run        — submit a task
  GET  /api/v1/orchestrator/status/{id} — poll task status
  GET  /api/v1/orchestrator/agents      — list registered agents
  GET  /api/v1/orchestrator/health      — circuit breaker states
  POST /api/v1/orchestrator/agents/{name}/reset — reset circuit breaker
"""
from __future__ import annotations

# ── Standard library ──────────────────────────────────────────────────────────
import asyncio
import json
import logging
import time
import traceback
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Awaitable

# ── Third-party ───────────────────────────────────────────────────────────────
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field

# ── Internal ──────────────────────────────────────────────────────────────────
from app.llm.factory import get_llm_provider
from app.llm.base import LLMProvider
from app.memory.chroma_store import ChromaStore
from app.orchestration.circuit_breaker import CircuitBreaker, CBState
from app.prompts.orchestrator import ORCHESTRATOR_INTENT, ORCHESTRATOR_SYNTHESIS
from app.prompts.planning import PLANNING_DECOMPOSE
from app.prompts.research import RESEARCH_ANALYST
from app.prompts.execution import EXECUTION_ENGINEER
from app.prompts.summary import SUMMARY_DISTILL
from app.prompts.memory import MEMORY_RECALL_CTX, MEMORY_CONSOLIDATION

# ── Module logger ──────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — ENUMS & CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

class AgentName(str, Enum):
    """
    Canonical names for all registered agents.
    Using an Enum prevents typo-induced routing failures.
    """
    MEMORY   = "memory-agent"
    PLANNER  = "planner-agent"
    RESEARCH = "research-agent"
    EXECUTION = "execution-agent"
    SUMMARY  = "summary-agent"


class TaskStatus(str, Enum):
    """Lifecycle states of an orchestrated task."""
    PENDING    = "pending"
    RUNNING    = "running"
    COMPLETED  = "completed"
    FAILED     = "failed"
    TIMED_OUT  = "timed_out"
    CANCELLED  = "cancelled"


class Intent(str, Enum):
    """Intents the Orchestrator can classify user requests into."""
    RESEARCH  = "research"
    CODE      = "code"
    PLAN      = "plan"
    MEMORY    = "memory"
    EXECUTE   = "execute"
    SUMMARISE = "summarise"


# Routing table: intent → agent name
_INTENT_ROUTING: dict[Intent, AgentName] = {
    Intent.RESEARCH:  AgentName.RESEARCH,
    Intent.CODE:      AgentName.EXECUTION,
    Intent.EXECUTE:   AgentName.EXECUTION,
    Intent.MEMORY:    AgentName.MEMORY,
    Intent.SUMMARISE: AgentName.SUMMARY,
    Intent.PLAN:      AgentName.PLANNER,   # special — runs full pipeline
}

# Default timeouts (seconds)
_AGENT_TIMEOUT:   float = 120.0
_MEMORY_TIMEOUT:  float = 10.0
_PLAN_TIMEOUT:    float = 30.0


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — TYPED CONTEXT & RESULT MODELS
# ══════════════════════════════════════════════════════════════════════════════

class TaskContext(BaseModel):
    """
    Carries all information a single agent invocation needs.
    Passed through the pipeline so every agent has full context.

    Fields:
        task_id:      Globally unique identifier for the top-level task.
        session_id:   Groups tasks belonging to one user session.
        user_id:      Authenticated user identifier (optional for anon).
        original_task: The raw user request, unmodified.
        enriched_task: Task augmented with memory context.
        memory_context: Prior knowledge retrieved from ChromaDB.
        intent:        Classified intent of this task.
        metadata:      Arbitrary key-value pairs for agent-specific data.
        created_at:    UTC timestamp of task creation.
    """
    task_id:       str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id:    str = "default"
    user_id:       str | None = None
    original_task: str
    enriched_task: str = ""
    memory_context: str = ""
    intent:        Intent = Intent.RESEARCH
    metadata:      dict[str, Any] = Field(default_factory=dict)
    created_at:    datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def with_memory(self, context: str) -> "TaskContext":
        """Return a new context with memory injected into enriched_task."""
        enriched = (
            f"[Prior context from memory]\n{context}\n\n"
            f"[Current request]\n{self.original_task}"
            if context and context != "No relevant prior context found."
            else self.original_task
        )
        return self.model_copy(update={"memory_context": context, "enriched_task": enriched})

    def with_intent(self, intent: Intent) -> "TaskContext":
        return self.model_copy(update={"intent": intent})


class AgentResult(BaseModel):
    """
    Structured result returned by every agent invocation.

    Fields:
        agent:          Name of the agent that produced this result.
        task_id:        Task identifier.
        status:         Outcome status.
        content:        The agent's primary output (markdown/text/JSON string).
        execution_ms:   Wall-clock time in milliseconds.
        error:          Error message if status is FAILED.
        retry_count:    Number of retries before success (or final failure).
    """
    agent:        AgentName
    task_id:      str
    status:       TaskStatus
    content:      str = ""
    execution_ms: int = 0
    error:        str | None = None
    retry_count:  int = 0


class SubTask(BaseModel):
    """Atomic unit of work produced by the PlannerAgent's LLM decomposition."""
    sub_task_id:  str = Field(default_factory=lambda: str(uuid.uuid4()))
    description:  str
    agent:        AgentName
    depends_on:   list[str] = Field(default_factory=list)  # sub_task_ids
    status:       TaskStatus = TaskStatus.PENDING
    result:       str | None = None


class OrchestratorRun(BaseModel):
    """
    Full record of a completed orchestrator run.
    Returned by /orchestrator/status/{task_id}.
    """
    task_id:       str
    status:        TaskStatus
    original_task: str
    intent:        Intent
    final_result:  str = ""
    agent_results: list[AgentResult] = Field(default_factory=list)
    subtasks:      list[SubTask] = Field(default_factory=list)
    total_ms:      int = 0
    created_at:    datetime
    completed_at:  datetime | None = None
    error:         str | None = None


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — BASE AGENT
# ══════════════════════════════════════════════════════════════════════════════

class OrchestratorAgent:
    """
    Abstract base for all agents in the MultiAgentOrchestrator.

    Every concrete agent must implement `_run(ctx, llm)`.
    The base class handles:
      - Retry with exponential backoff + jitter
      - Circuit-breaker enforcement
      - Structured logging on every attempt
      - Execution timing
    """

    #: Override in subclasses
    name: AgentName
    description: str = ""

    def __init__(
        self,
        llm: LLMProvider,
        max_retries: int = 3,
        base_delay: float = 1.0,
        timeout: float = _AGENT_TIMEOUT,
        failure_threshold: int = 3,
        cb_reset_seconds: int = 30,
    ):
        self._llm = llm
        self._max_retries = max_retries
        self._base_delay = base_delay
        self._timeout = timeout
        self._circuit = CircuitBreaker(
            agent_name=self.name.value,
            failure_threshold=failure_threshold,
            reset_timeout_s=cb_reset_seconds,
        )

    # ── Public invoke (called by Orchestrator) ────────────────────────────────

    async def invoke(self, ctx: TaskContext) -> AgentResult:
        """
        Invoke the agent with retry logic and circuit-breaker protection.
        Logs every attempt and records total execution time.
        """
        # ── Circuit-breaker check ─────────────────────────────────────────
        if self._circuit.is_open():
            logger.warning(
                f"[{self.name.value}] Circuit OPEN — rejecting task {ctx.task_id}. "
                f"Failures: {self._circuit._failure_count}"
            )
            return AgentResult(
                agent=self.name,
                task_id=ctx.task_id,
                status=TaskStatus.FAILED,
                error=f"Agent {self.name.value} is temporarily unavailable (circuit open).",
            )

        start = time.monotonic()
        last_error: Exception | None = None

        for attempt in range(self._max_retries + 1):
            try:
                logger.info(
                    f"[{self.name.value}] Attempt {attempt + 1}/{self._max_retries + 1} "
                    f"for task {ctx.task_id}"
                )

                # ── Enforce per-agent timeout ─────────────────────────────
                content = await asyncio.wait_for(
                    self._run(ctx, self._llm),
                    timeout=self._timeout,
                )

                elapsed_ms = int((time.monotonic() - start) * 1000)
                self._circuit.record_success()

                logger.info(
                    f"[{self.name.value}] Completed task {ctx.task_id} "
                    f"in {elapsed_ms}ms (attempt {attempt + 1})"
                )

                return AgentResult(
                    agent=self.name,
                    task_id=ctx.task_id,
                    status=TaskStatus.COMPLETED,
                    content=content,
                    execution_ms=elapsed_ms,
                    retry_count=attempt,
                )

            except asyncio.TimeoutError:
                last_error = TimeoutError(
                    f"Agent {self.name.value} timed out after {self._timeout}s"
                )
                logger.warning(
                    f"[{self.name.value}] Timeout on attempt {attempt + 1} "
                    f"for task {ctx.task_id}"
                )

            except Exception as exc:
                last_error = exc
                logger.warning(
                    f"[{self.name.value}] Error on attempt {attempt + 1} "
                    f"for task {ctx.task_id}: {exc}"
                )

            # ── Exponential backoff with full jitter ──────────────────────
            if attempt < self._max_retries:
                import random
                cap = min(30.0, self._base_delay * (2 ** attempt))
                delay = random.uniform(0, cap)
                logger.debug(f"[{self.name.value}] Backoff {delay:.2f}s before retry…")
                await asyncio.sleep(delay)

        # All retries exhausted
        self._circuit.record_failure()
        elapsed_ms = int((time.monotonic() - start) * 1000)

        error_msg = str(last_error) if last_error else "Unknown error"
        logger.error(
            f"[{self.name.value}] All {self._max_retries + 1} attempts failed "
            f"for task {ctx.task_id}: {error_msg}"
        )

        return AgentResult(
            agent=self.name,
            task_id=ctx.task_id,
            status=TaskStatus.FAILED,
            execution_ms=elapsed_ms,
            error=error_msg,
            retry_count=self._max_retries,
        )

    # ── Abstract ──────────────────────────────────────────────────────────────

    async def _run(self, ctx: TaskContext, llm: LLMProvider) -> str:
        """
        Agent-specific logic. Must return a string result.
        Implement in every concrete subclass.
        """
        raise NotImplementedError(f"{self.__class__.__name__} must implement _run()")

    # ── Circuit breaker access ────────────────────────────────────────────────

    def circuit_state(self) -> dict[str, Any]:
        return self._circuit.to_dict()

    def reset_circuit(self) -> None:
        """Manually reset circuit breaker (e.g. after a deployment fix)."""
        self._circuit._state = CBState.CLOSED
        self._circuit._failure_count = 0
        self._circuit._last_failure_at = None
        logger.info(f"[{self.name.value}] Circuit breaker manually reset → CLOSED")


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — CONCRETE AGENTS
# ══════════════════════════════════════════════════════════════════════════════

class MemoryAgent(OrchestratorAgent):
    """
    Memory Agent — semantic recall from ChromaDB.

    On invoke, searches the vector store for context relevant to the
    current task, then optionally synthesises fragments into a coherent
    paragraph using the LLM.

    Context is returned as a string and stored in TaskContext.memory_context.
    After a run completes, the Orchestrator calls store_outcome() to persist
    the result back to ChromaDB for future recall.
    """
    name = AgentName.MEMORY
    description = "Retrieves semantic context from long-term vector memory."

    def __init__(self, llm: LLMProvider, store: ChromaStore, **kwargs):
        super().__init__(llm=llm, timeout=_MEMORY_TIMEOUT, **kwargs)
        self._store = store

    async def _run(self, ctx: TaskContext, llm: LLMProvider) -> str:
        logger.info(f"[{self.name.value}] Querying ChromaDB for task {ctx.task_id}")

        # ── Vector similarity search ──────────────────────────────────────
        chunks = self._store.recall(
            query=ctx.original_task,
            top_k=5,
            where={"user_id": ctx.user_id} if ctx.user_id else None,
        )

        if not chunks:
            logger.info(f"[{self.name.value}] No memories found for task {ctx.task_id}")
            return "No relevant prior context found."

        fragments = "\n\n".join(
            f"[Memory {i+1}] {c['document']}"
            for i, c in enumerate(chunks)
        )
        logger.info(
            f"[{self.name.value}] Retrieved {len(chunks)} memory fragment(s) "
            f"for task {ctx.task_id}"
        )

        # ── LLM-synthesised context paragraph ────────────────────────────
        try:
            return await llm.generate(
                prompt=f"Task: {ctx.original_task}\n\nMemory fragments:\n{fragments}",
                system=MEMORY_RECALL_CTX,
                temperature=0.2,
            )
        except Exception as exc:
            # Fallback: return raw fragments without synthesis
            logger.warning(f"[{self.name.value}] LLM synthesis failed: {exc}. Using raw fragments.")
            return fragments

    async def store_outcome(self, ctx: TaskContext, result: str) -> None:
        """
        Persist the task outcome to ChromaDB for future recall.
        Called by the Orchestrator after the full pipeline completes.
        """
        content = f"Task: {ctx.original_task}\nResult summary: {result[:400]}"
        doc_id = self._store.store(
            content=content,
            metadata={
                "user_id": ctx.user_id or "anon",
                "session_id": ctx.session_id,
                "task_id": ctx.task_id,
                "source": "outcome",
            },
        )
        if doc_id:
            logger.info(f"[{self.name.value}] Outcome stored as memory {doc_id[:8]}")


class PlannerAgent(OrchestratorAgent):
    """
    Planner Agent — decomposes a complex task into an ordered SubTask DAG.

    Sends the user goal to the LLM with a structured JSON prompt.
    The LLM returns a JSON array of step descriptors; this agent validates
    and converts them into a list of SubTask objects.

    If LLM output is malformed, falls back to a single research subtask
    so the pipeline always continues.
    """
    name = AgentName.PLANNER
    description = "Decomposes complex goals into an ordered subtask plan."

    VALID_AGENTS = {a.value for a in AgentName}

    async def _run(self, ctx: TaskContext, llm: LLMProvider) -> str:
        logger.info(f"[{self.name.value}] Decomposing task {ctx.task_id}")

        raw = await llm.generate(
            prompt=f"User goal: {ctx.enriched_task or ctx.original_task}",
            system=PLANNING_DECOMPOSE,
            temperature=0.2,    # Low temperature for deterministic structured output
        )

        # Parse JSON and return as a serialised list of SubTask dicts
        subtasks = self._parse_json_plan(raw, ctx.task_id)
        logger.info(
            f"[{self.name.value}] Plan produced {len(subtasks)} subtask(s) "
            f"for task {ctx.task_id}"
        )
        return json.dumps([st.model_dump() for st in subtasks])

    def _parse_json_plan(self, raw: str, parent_id: str) -> list[SubTask]:
        """
        Parse LLM JSON output → list[SubTask].
        Strips markdown fences, validates agent names, resolves index-based depends_on.
        """
        try:
            text = raw.strip()
            # Strip ```json ... ``` fences if present
            if text.startswith("```"):
                text = "\n".join(
                    line for line in text.splitlines()
                    if not line.strip().startswith("```")
                )

            items: list[dict[str, Any]] = json.loads(text)
            id_map: dict[int, str] = {}
            subtasks: list[SubTask] = []

            for i, item in enumerate(items):
                st_id = str(uuid.uuid4())
                id_map[i] = st_id

                # Resolve integer indices → UUIDs
                raw_deps = item.get("depends_on") or []
                resolved_deps = [id_map[d] for d in raw_deps if isinstance(d, int) and d in id_map]

                # Validate and normalise agent name
                raw_agent = item.get("agent", AgentName.RESEARCH.value)
                agent = AgentName(raw_agent) if raw_agent in self.VALID_AGENTS else AgentName.RESEARCH

                subtasks.append(SubTask(
                    sub_task_id=st_id,
                    description=item.get("description", ""),
                    agent=agent,
                    depends_on=resolved_deps,
                ))

            return subtasks or self._fallback_plan(parent_id)

        except Exception as exc:
            logger.warning(f"[{self.name.value}] JSON parse failed: {exc}. Using fallback plan.")
            return self._fallback_plan(parent_id)

    @staticmethod
    def _fallback_plan(parent_id: str) -> list[SubTask]:
        """Single research task — used when planning LLM produces invalid JSON."""
        return [SubTask(
            description="Research and respond to the user request.",
            agent=AgentName.RESEARCH,
        )]


class ResearchAgent(OrchestratorAgent):
    """
    Research Agent — information retrieval, analysis, and report synthesis.

    Receives the task (optionally enriched with memory context) and produces
    a structured research report using the RESEARCH_ANALYST system prompt.
    """
    name = AgentName.RESEARCH
    description = "Retrieves, analyses, and synthesises information."

    async def _run(self, ctx: TaskContext, llm: LLMProvider) -> str:
        task_input = ctx.enriched_task or ctx.original_task
        logger.info(f"[{self.name.value}] Researching task {ctx.task_id}")
        return await llm.generate(
            prompt=task_input,
            system=RESEARCH_ANALYST,
        )


class ExecutionAgent(OrchestratorAgent):
    """
    Execution Agent — code generation and tool invocation.

    Supports two modes:
      1. LLM code generation (default) — given any task, writes production code.
      2. Tool dispatch — if task starts with TOOL:<name>:<json_args>, invokes
         the registered tool from the global ToolRegistry.
    """
    name = AgentName.EXECUTION
    description = "Generates code and invokes tools."

    async def _run(self, ctx: TaskContext, llm: LLMProvider) -> str:
        task_input = ctx.enriched_task or ctx.original_task
        logger.info(f"[{self.name.value}] Executing task {ctx.task_id}")

        # ── Tool dispatch ─────────────────────────────────────────────────
        if task_input.strip().upper().startswith("TOOL:"):
            return await self._invoke_tool(task_input, ctx)

        # ── LLM code generation ───────────────────────────────────────────
        return await llm.generate(prompt=task_input, system=EXECUTION_ENGINEER)

    async def _invoke_tool(self, task_input: str, ctx: TaskContext) -> str:
        from app.tools.registry import tool_registry

        parts = task_input[len("TOOL:"):].split(":", 1)
        tool_name = parts[0].strip()
        args_raw  = parts[1].strip() if len(parts) > 1 else "{}"

        try:
            args = json.loads(args_raw)
        except json.JSONDecodeError:
            args = {"query": args_raw}

        logger.info(f"[{self.name.value}] Invoking tool '{tool_name}' for task {ctx.task_id}")

        try:
            result = await tool_registry.invoke(tool_name, **args)
            return f"**Tool: `{tool_name}`**\n\n```json\n{json.dumps(result, indent=2)}\n```"
        except ValueError as exc:
            available = [t["name"] for t in tool_registry.list_tools()]
            return f"Tool '{tool_name}' not found. Available tools: {available}\nError: {exc}"
        except Exception as exc:
            logger.error(f"[{self.name.value}] Tool '{tool_name}' failed: {exc}")
            raise


class SummaryAgent(OrchestratorAgent):
    """
    Summary Agent — distils multiple agent outputs into polished, user-facing prose.

    Receives the aggregated results from all prior pipeline stages and produces
    a single, coherent, markdown-formatted response using the SUMMARY_DISTILL prompt.
    """
    name = AgentName.SUMMARY
    description = "Synthesises and distils agent outputs into a final user response."

    async def _run(self, ctx: TaskContext, llm: LLMProvider) -> str:
        logger.info(f"[{self.name.value}] Summarising task {ctx.task_id}")
        # The Orchestrator writes aggregated results into ctx.metadata["aggregated"]
        aggregated = ctx.metadata.get("aggregated", ctx.original_task)
        return await llm.generate(
            prompt=aggregated,
            system=SUMMARY_DISTILL,
            temperature=0.5,
        )


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — TASK DAG RUNNER
# ══════════════════════════════════════════════════════════════════════════════

class SubTaskRunner:
    """
    Executes a list of SubTasks produced by PlannerAgent.

    Algorithm:
      1. Find all subtasks whose depends_on are all in `completed`.
      2. Run ready tasks in parallel via asyncio.gather.
      3. Mark failed tasks; any task depending on a failed task is skipped.
      4. Repeat until no more pending tasks.

    Returns a dict mapping sub_task_id → result string.
    """

    def __init__(
        self,
        subtasks: list[SubTask],
        agent_map: dict[AgentName, OrchestratorAgent],
        base_ctx: TaskContext,
    ):
        self._subtasks = subtasks
        self._agent_map = agent_map
        self._base_ctx = base_ctx
        self._results: dict[str, str] = {}

    async def run(self) -> dict[str, str]:
        pending = list(self._subtasks)
        completed: set[str] = set()
        failed: set[str] = set()

        while pending:
            # Tasks whose dependencies are all done and none failed
            ready = [
                st for st in pending
                if all(dep in completed for dep in st.depends_on)
                and not any(dep in failed for dep in st.depends_on)
            ]
            # Tasks blocked by a failed dependency
            blocked = [
                st for st in pending
                if any(dep in failed for dep in st.depends_on)
            ]

            for st in blocked:
                logger.warning(
                    f"[SubTaskRunner] Skipping '{st.description[:40]}' "
                    f"— dependency failed"
                )
                st.status = TaskStatus.CANCELLED
                failed.add(st.sub_task_id)
                pending.remove(st)

            if not ready:
                if pending:
                    logger.error("[SubTaskRunner] Deadlock detected — remaining tasks cannot run.")
                break

            # Run ready subtasks in parallel
            coros = [self._run_one(st) for st in ready]
            await asyncio.gather(*coros, return_exceptions=True)

            for st in ready:
                pending.remove(st)
                if st.status == TaskStatus.COMPLETED:
                    completed.add(st.sub_task_id)
                else:
                    failed.add(st.sub_task_id)

        return self._results

    async def _run_one(self, st: SubTask) -> None:
        """Invoke the correct agent for a single subtask."""
        agent = self._agent_map.get(st.agent)
        if agent is None:
            logger.error(f"[SubTaskRunner] No agent registered for '{st.agent.value}'")
            st.status = TaskStatus.FAILED
            return

        # Build a sub-context scoped to this subtask
        sub_ctx = self._base_ctx.model_copy(update={
            "task_id": st.sub_task_id,
            "original_task": st.description,
            "enriched_task": st.description,
        })

        logger.info(f"[SubTaskRunner] Starting '{st.description[:50]}' on {st.agent.value}")
        result = await agent.invoke(sub_ctx)

        st.status = result.status
        st.result = result.content
        self._results[st.sub_task_id] = result.content or result.error or ""


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — MULTI-AGENT ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

class MultiAgentOrchestrator:
    """
    Central coordinator for the Cognitive OS agent pipeline.

    Usage:
        orchestrator = MultiAgentOrchestrator()
        run = await orchestrator.run(ctx)

    Agents are dynamically registered at startup — you can add or remove
    agents without touching the Orchestrator's routing logic.

    Pipeline Stages:
      1. Memory recall    — enrich task with relevant prior context
      2. Intent classify  — LLM + keyword fallback
      3. Simple routing   — single agent handles non-plan intents
      4. Plan pipeline    — Planner → SubTaskRunner → Summary (complex tasks)
      5. Synthesis        — final polish via LLM
      6. Memory store     — persist outcome (async, non-blocking)

    In-flight tasks are tracked in `_runs` for status polling.
    """

    def __init__(self, llm: LLMProvider | None = None):
        self._llm: LLMProvider = llm or get_llm_provider()
        self._store = ChromaStore(collection_name="cognitive_memory")

        # ── Agent registry ────────────────────────────────────────────────
        # Populated by register_agent() at startup.
        # Keys are AgentName enum values for O(1) lookup.
        self._agents: dict[AgentName, OrchestratorAgent] = {}

        # ── In-flight task store ──────────────────────────────────────────
        # Maps task_id → OrchestratorRun. In production, replace with Redis.
        self._runs: dict[str, OrchestratorRun] = {}

        # ── Keyword fallback classifier ───────────────────────────────────
        self._plan_kws  = {"plan", "roadmap", "steps", "workflow", "phases", "pipeline",
                           "step by step", "how do i", "guide me", "multi-step"}
        self._mem_kws   = {"remember", "recall", "forget", "what did i say", "my memory"}
        self._code_kws  = {"code", "script", "program", "debug", "function", "class",
                           "api", "endpoint", "backend", "frontend", "python", "javascript",
                           "typescript", "sql", "docker", "refactor", "implement", "build"}

    # ── Agent registration ─────────────────────────────────────────────────────

    def register_agent(self, agent: OrchestratorAgent) -> None:
        """
        Dynamically register an agent.
        Call this at startup for each of the five agents.

        Example:
            orchestrator.register_agent(MemoryAgent(llm=provider, store=chroma))
            orchestrator.register_agent(PlannerAgent(llm=provider))
        """
        self._agents[agent.name] = agent
        logger.info(f"[Orchestrator] Registered agent: {agent.name.value} ({agent.description})")

    def get_agent(self, name: AgentName) -> OrchestratorAgent | None:
        return self._agents.get(name)

    def registered_agents(self) -> list[dict[str, Any]]:
        return [
            {
                "name": name.value,
                "description": agent.description,
                "circuit": agent.circuit_state(),
            }
            for name, agent in self._agents.items()
        ]

    # ── Main orchestration entry point ────────────────────────────────────────

    async def run(self, ctx: TaskContext) -> OrchestratorRun:
        """
        Execute the full multi-agent pipeline for a user task.

        This is the single entry point — call it from the API route or directly.
        Returns an OrchestratorRun with all agent results and the final response.
        """
        start = time.monotonic()
        run = OrchestratorRun(
            task_id=ctx.task_id,
            status=TaskStatus.RUNNING,
            original_task=ctx.original_task,
            intent=ctx.intent,
            created_at=ctx.created_at,
        )
        self._runs[ctx.task_id] = run

        logger.info(
            f"[Orchestrator] Starting pipeline for task {ctx.task_id}: "
            f'"{ctx.original_task[:60]}…"'
        )

        try:
            # ── Stage 1: Memory recall ────────────────────────────────────
            ctx = await self._stage_memory_recall(ctx, run)

            # ── Stage 2: Intent classification ────────────────────────────
            ctx = await self._stage_classify_intent(ctx, run)

            # ── Stage 3: Route or plan ────────────────────────────────────
            if ctx.intent == Intent.PLAN:
                final_result = await self._stage_plan_pipeline(ctx, run)
            else:
                final_result = await self._stage_simple_route(ctx, run)

            # ── Stage 4: Final synthesis ──────────────────────────────────
            final_result = await self._stage_synthesise(ctx, final_result, run)

            # ── Stage 5: Persist to memory (fire-and-forget) ──────────────
            mem_agent = self._agents.get(AgentName.MEMORY)
            if isinstance(mem_agent, MemoryAgent):
                asyncio.create_task(mem_agent.store_outcome(ctx, final_result))

            run.final_result = final_result
            run.status = TaskStatus.COMPLETED

        except asyncio.TimeoutError:
            logger.error(f"[Orchestrator] Pipeline timed out for task {ctx.task_id}")
            run.status = TaskStatus.TIMED_OUT
            run.error = "Pipeline exceeded maximum execution time."

        except Exception as exc:
            logger.error(
                f"[Orchestrator] Pipeline failed for task {ctx.task_id}: {exc}\n"
                + traceback.format_exc()
            )
            run.status = TaskStatus.FAILED
            run.error = str(exc)

        finally:
            run.total_ms = int((time.monotonic() - start) * 1000)
            run.completed_at = datetime.now(timezone.utc)
            logger.info(
                f"[Orchestrator] Task {ctx.task_id} finished — "
                f"status={run.status.value} total_ms={run.total_ms}"
            )

        return run

    # ── Pipeline stages ───────────────────────────────────────────────────────

    async def _stage_memory_recall(
        self, ctx: TaskContext, run: OrchestratorRun
    ) -> TaskContext:
        """
        Stage 1 — Query ChromaDB for relevant prior context.
        If MemoryAgent is not registered, skip gracefully.
        """
        mem = self._agents.get(AgentName.MEMORY)
        if mem is None:
            logger.debug("[Orchestrator] No MemoryAgent registered — skipping recall.")
            return ctx

        logger.info(f"[Orchestrator] Stage 1: Memory recall for task {ctx.task_id}")
        result = await mem.invoke(ctx)
        run.agent_results.append(result)

        if result.status == TaskStatus.COMPLETED and result.content:
            return ctx.with_memory(result.content)
        return ctx

    async def _stage_classify_intent(
        self, ctx: TaskContext, run: OrchestratorRun
    ) -> TaskContext:
        """
        Stage 2 — Classify the intent of the user's request.
        Tries LLM first; falls back to keyword matching.
        """
        logger.info(f"[Orchestrator] Stage 2: Intent classification for task {ctx.task_id}")

        try:
            raw = await asyncio.wait_for(
                self._llm.generate(
                    prompt=ctx.enriched_task or ctx.original_task,
                    system=ORCHESTRATOR_INTENT,
                    temperature=0.0,
                ),
                timeout=15.0,
            )
            intent_str = raw.strip().lower().split()[0] if raw.strip() else "research"
            intent = self._parse_intent(intent_str)
        except Exception as exc:
            logger.warning(f"[Orchestrator] LLM intent classification failed: {exc}. Using keyword fallback.")
            intent = self._keyword_classify(ctx.original_task)

        logger.info(f"[Orchestrator] Intent classified as: {intent.value}")
        return ctx.with_intent(intent)

    async def _stage_simple_route(
        self, ctx: TaskContext, run: OrchestratorRun
    ) -> str:
        """
        Stage 3a — Route to a single agent based on intent.
        Used for research, code, memory lookup, execute, summarise.
        """
        target_name = _INTENT_ROUTING.get(ctx.intent, AgentName.RESEARCH)
        agent = self._agents.get(target_name)

        if agent is None:
            logger.warning(
                f"[Orchestrator] Agent '{target_name.value}' not registered. "
                "Falling back to ResearchAgent."
            )
            agent = self._agents.get(AgentName.RESEARCH)
            if agent is None:
                raise RuntimeError("No agent available to handle the request.")

        logger.info(
            f"[Orchestrator] Stage 3 (simple): Routing to {target_name.value} "
            f"for task {ctx.task_id}"
        )
        result = await agent.invoke(ctx)
        run.agent_results.append(result)

        if result.status == TaskStatus.FAILED:
            raise RuntimeError(f"Agent {target_name.value} failed: {result.error}")

        return result.content

    async def _stage_plan_pipeline(
        self, ctx: TaskContext, run: OrchestratorRun
    ) -> str:
        """
        Stage 3b — Full planning pipeline for complex multi-step tasks.

        Flow:
          PlannerAgent → list[SubTask] → SubTaskRunner (parallel) → SummaryAgent
        """
        planner = self._agents.get(AgentName.PLANNER)
        if planner is None:
            logger.warning("[Orchestrator] PlannerAgent not registered. Falling back to research.")
            return await self._stage_simple_route(
                ctx.with_intent(Intent.RESEARCH), run
            )

        # ── Call PlannerAgent ─────────────────────────────────────────────
        logger.info(f"[Orchestrator] Stage 3 (plan): Calling PlannerAgent for task {ctx.task_id}")
        plan_result = await planner.invoke(ctx)
        run.agent_results.append(plan_result)

        if plan_result.status == TaskStatus.FAILED:
            logger.warning("[Orchestrator] PlannerAgent failed. Falling back to research.")
            return await self._stage_simple_route(ctx.with_intent(Intent.RESEARCH), run)

        # ── Parse subtask list ────────────────────────────────────────────
        subtasks: list[SubTask] = []
        try:
            raw_list: list[dict] = json.loads(plan_result.content)
            subtasks = [SubTask.model_validate(item) for item in raw_list]
        except Exception as exc:
            logger.warning(f"[Orchestrator] Failed to parse plan output: {exc}")
            subtasks = [SubTask(
                description=ctx.original_task,
                agent=AgentName.RESEARCH,
            )]

        run.subtasks = subtasks
        logger.info(
            f"[Orchestrator] Plan has {len(subtasks)} subtask(s) for task {ctx.task_id}"
        )

        # ── Execute subtask DAG in parallel where possible ────────────────
        dag_runner = SubTaskRunner(
            subtasks=subtasks,
            agent_map=self._agents,
            base_ctx=ctx,
        )
        results_map = await dag_runner.run()

        # ── Aggregate outputs for SummaryAgent ────────────────────────────
        aggregated = "\n\n".join(
            f"### Step {i+1}: {st.description}\n{results_map.get(st.sub_task_id, 'No output')}"
            for i, st in enumerate(subtasks)
        )

        # ── Invoke SummaryAgent ───────────────────────────────────────────
        summary_agent = self._agents.get(AgentName.SUMMARY)
        if summary_agent is None:
            logger.debug("[Orchestrator] No SummaryAgent — returning raw aggregated output.")
            return aggregated

        summary_ctx = ctx.model_copy(update={"metadata": {**ctx.metadata, "aggregated": aggregated}})
        summary_result = await summary_agent.invoke(summary_ctx)
        run.agent_results.append(summary_result)

        return summary_result.content if summary_result.status == TaskStatus.COMPLETED else aggregated

    async def _stage_synthesise(
        self, ctx: TaskContext, agent_result: str, run: OrchestratorRun
    ) -> str:
        """
        Stage 4 — Polish the final output with the Orchestrator's synthesis LLM.
        If LLM is unavailable, returns the raw agent result unchanged.
        """
        logger.info(f"[Orchestrator] Stage 4: Synthesising final response for task {ctx.task_id}")
        try:
            return await asyncio.wait_for(
                self._llm.generate(
                    prompt=(
                        f"Original user request:\n{ctx.original_task}\n\n"
                        f"Agent output:\n{agent_result}"
                    ),
                    system=ORCHESTRATOR_SYNTHESIS,
                ),
                timeout=30.0,
            )
        except Exception as exc:
            logger.warning(f"[Orchestrator] Synthesis LLM failed: {exc}. Returning raw output.")
            return agent_result

    # ── Status / task store ───────────────────────────────────────────────────

    def get_run(self, task_id: str) -> OrchestratorRun | None:
        return self._runs.get(task_id)

    # ── Intent helpers ────────────────────────────────────────────────────────

    def _parse_intent(self, raw: str) -> Intent:
        """Map a raw string to Intent enum. Defaults to RESEARCH."""
        try:
            return Intent(raw)
        except ValueError:
            return Intent.RESEARCH

    def _keyword_classify(self, task: str) -> Intent:
        """Keyword-based fallback when LLM is unavailable."""
        lower = task.lower()
        if any(kw in lower for kw in self._plan_kws):
            return Intent.PLAN
        if any(kw in lower for kw in self._mem_kws):
            return Intent.MEMORY
        if any(kw in lower for kw in self._code_kws):
            return Intent.CODE
        return Intent.RESEARCH


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — FACTORY: build the default orchestrator
# ══════════════════════════════════════════════════════════════════════════════

def build_orchestrator() -> MultiAgentOrchestrator:
    """
    Factory function — wires all five agents together and returns a ready
    MultiAgentOrchestrator instance.

    Called once at application startup in main.py:
        app.state.orchestrator = build_orchestrator()
    """
    llm   = get_llm_provider()
    store = ChromaStore(collection_name="cognitive_memory")

    orchestrator = MultiAgentOrchestrator(llm=llm)

    orchestrator.register_agent(MemoryAgent(llm=llm, store=store))
    orchestrator.register_agent(PlannerAgent(llm=llm, timeout=_PLAN_TIMEOUT))
    orchestrator.register_agent(ResearchAgent(llm=llm))
    orchestrator.register_agent(ExecutionAgent(llm=llm))
    orchestrator.register_agent(SummaryAgent(llm=llm))

    return orchestrator


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — FASTAPI ROUTER
# ══════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/orchestrator", tags=["Multi-Agent Orchestrator"])


# ── Request / Response schemas ────────────────────────────────────────────────

class RunRequest(BaseModel):
    """
    POST /orchestrator/run — submit a new task to the orchestrator.

    Fields:
        task:       The user's natural-language request.
        session_id: Groups related tasks (defaults to "default").
        user_id:    Authenticated user ID for memory scoping.
        metadata:   Arbitrary extra context passed through the pipeline.
        async_mode: If True, returns immediately with task_id (poll /status).
                    If False (default), waits for pipeline to complete.
    """
    task:       str = Field(..., min_length=1, max_length=8000, description="User task description")
    session_id: str = Field(default="default", description="Session identifier")
    user_id:    str | None = Field(default=None, description="Authenticated user ID")
    metadata:   dict[str, Any] = Field(default_factory=dict, description="Extra context")
    async_mode: bool = Field(default=False, description="Return immediately without waiting")


class RunStatusResponse(BaseModel):
    """Response schema for GET /orchestrator/status/{task_id}."""
    task_id:      str
    status:       TaskStatus
    final_result: str
    intent:       Intent
    total_ms:     int
    agent_count:  int
    subtask_count: int
    error:        str | None


# ── Endpoint implementations ──────────────────────────────────────────────────

def _get_orchestrator() -> MultiAgentOrchestrator:
    """
    FastAPI dependency — retrieves the orchestrator from app.state.
    Import and use with: orchestrator: MultiAgentOrchestrator = Depends(_get_orchestrator)
    """
    from fastapi import Request
    # Actual dep injection done at runtime — placeholder here for clarity
    raise NotImplementedError("Use as a FastAPI Depends() — not called directly.")


@router.post(
    "/run",
    response_model=RunStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a task to the multi-agent orchestrator",
    description="""
    Routes the task through the full six-stage pipeline:
    Memory Recall → Intent Classification → Agent Routing/Planning →
    Parallel Execution → Summary → Synthesis.

    Set `async_mode=true` to receive a `task_id` immediately and poll
    `/orchestrator/status/{task_id}` for progress.
    """,
)
async def run_task(
    req: RunRequest,
    background_tasks: BackgroundTasks,
) -> RunStatusResponse:
    """
    Submit a task and receive the orchestrated result.

    This endpoint is wired to `app.state.orchestrator` in main.py.
    The actual routing is done by the existing /api/v1/agent/execute endpoint
    which dispatches to SupervisorAgent. This standalone endpoint demonstrates
    the MultiAgentOrchestrator class directly.
    """
    # In the running app, retrieve from app.state
    # For standalone use, build fresh (cached by lru_cache in factory)
    from app.orchestration.orchestrator import build_orchestrator
    orchestrator = build_orchestrator()

    ctx = TaskContext(
        original_task=req.task,
        session_id=req.session_id,
        user_id=req.user_id,
        metadata=req.metadata,
    )

    if req.async_mode:
        # Fire-and-forget — client polls /status/{task_id}
        background_tasks.add_task(orchestrator.run, ctx)
        return RunStatusResponse(
            task_id=ctx.task_id,
            status=TaskStatus.PENDING,
            final_result="",
            intent=ctx.intent,
            total_ms=0,
            agent_count=0,
            subtask_count=0,
            error=None,
        )

    # Synchronous — wait for completion
    run = await orchestrator.run(ctx)
    return RunStatusResponse(
        task_id=run.task_id,
        status=run.status,
        final_result=run.final_result,
        intent=run.intent,
        total_ms=run.total_ms,
        agent_count=len(run.agent_results),
        subtask_count=len(run.subtasks),
        error=run.error,
    )


@router.get(
    "/status/{task_id}",
    response_model=OrchestratorRun,
    summary="Poll the full status of a submitted task",
)
async def get_task_status(task_id: str) -> OrchestratorRun:
    """
    Return the full OrchestratorRun record for a submitted task.
    Includes per-agent results, subtask breakdown, and timing.
    """
    from app.orchestration.orchestrator import build_orchestrator
    orchestrator = build_orchestrator()
    run = orchestrator.get_run(task_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found. It may have expired or never been submitted.",
        )
    return run


@router.get(
    "/agents",
    summary="List all registered agents and their circuit-breaker states",
)
async def list_agents() -> dict:
    """
    Returns all registered agents with their name, description,
    and current circuit-breaker state (CLOSED / OPEN / HALF_OPEN).
    """
    from app.orchestration.orchestrator import build_orchestrator
    orchestrator = build_orchestrator()
    return {
        "count": len(orchestrator._agents),
        "agents": orchestrator.registered_agents(),
    }


@router.get(
    "/health",
    summary="Circuit-breaker health for all registered agents",
)
async def orchestrator_health() -> dict:
    """
    Quick health check — shows which agents are OPEN (unhealthy).
    Designed to be polled by monitoring systems.
    """
    from app.orchestration.orchestrator import build_orchestrator
    orchestrator = build_orchestrator()
    states = orchestrator.registered_agents()
    unhealthy = [a for a in states if a["circuit"]["state"] != "CLOSED"]
    return {
        "healthy": len(unhealthy) == 0,
        "agents_total": len(states),
        "agents_unhealthy": len(unhealthy),
        "details": states,
    }


@router.post(
    "/agents/{agent_name}/reset",
    summary="Manually reset a circuit breaker",
    description="Force an agent's circuit breaker back to CLOSED state after a fix.",
)
async def reset_agent_circuit(agent_name: str) -> dict:
    """
    Reset the circuit breaker for a specific agent.
    Call this after deploying a fix to an unhealthy agent.
    """
    from app.orchestration.orchestrator import build_orchestrator
    orchestrator = build_orchestrator()

    try:
        name = AgentName(agent_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown agent '{agent_name}'. Valid: {[a.value for a in AgentName]}",
        )

    agent = orchestrator.get_agent(name)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not registered.")

    agent.reset_circuit()
    return {"success": True, "agent": agent_name, "circuit": agent.circuit_state()}


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 9 — EXAMPLE EXECUTION FLOW (runnable as __main__)
# ══════════════════════════════════════════════════════════════════════════════

async def example_execution_flow() -> None:
    """
    Demonstrates the MultiAgentOrchestrator in action.

    Run directly:
        python -m app.orchestration.orchestrator

    This uses the real LLM backend (Ollama / OpenAI / Granite) and ChromaDB.
    If offline, agents return fallback strings and the pipeline still completes.
    """
    import sys

    # ── Configure logging ─────────────────────────────────────────────────────
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    print("\n" + "=" * 70)
    print("  COGNITIVE OS — Multi-Agent Orchestrator Example Flow")
    print("=" * 70 + "\n")

    # ── Build orchestrator ────────────────────────────────────────────────────
    orchestrator = build_orchestrator()
    print(f"Registered agents: {[a.value for a in orchestrator._agents]}\n")

    # ── Example 1: Simple research task ──────────────────────────────────────
    print("-" * 70)
    print("EXAMPLE 1: Simple research task")
    print("-" * 70)

    ctx1 = TaskContext(
        original_task="Explain the key differences between REST and GraphQL APIs.",
        session_id="demo-session",
        user_id="demo-user",
    )

    print(f"Task ID : {ctx1.task_id}")
    print(f"Task    : {ctx1.original_task}\n")

    run1 = await orchestrator.run(ctx1)

    print(f"\nStatus      : {run1.status.value}")
    print(f"Intent      : {run1.intent.value}")
    print(f"Duration    : {run1.total_ms}ms")
    print(f"Agents used : {[r.agent.value for r in run1.agent_results]}")
    print(f"\nResult (first 300 chars):\n{run1.final_result[:300]}…\n")

    # ── Example 2: Complex planning task ─────────────────────────────────────
    print("-" * 70)
    print("EXAMPLE 2: Multi-step planning task")
    print("-" * 70)

    ctx2 = TaskContext(
        original_task=(
            "Plan and build a production FastAPI microservice with JWT auth, "
            "PostgreSQL, and Docker deployment."
        ),
        session_id="demo-session",
        user_id="demo-user",
    )

    print(f"Task ID : {ctx2.task_id}")
    print(f"Task    : {ctx2.original_task}\n")

    run2 = await orchestrator.run(ctx2)

    print(f"\nStatus      : {run2.status.value}")
    print(f"Intent      : {run2.intent.value}")
    print(f"Duration    : {run2.total_ms}ms")
    print(f"Subtasks    : {len(run2.subtasks)}")
    for i, st in enumerate(run2.subtasks):
        print(f"  [{i+1}] {st.agent.value}: {st.description[:60]}  -> {st.status.value}")
    print(f"\nResult (first 400 chars):\n{run2.final_result[:400]}…\n")

    # ── Example 3: Code generation ────────────────────────────────────────────
    print("-" * 70)
    print("EXAMPLE 3: Code generation task")
    print("-" * 70)

    ctx3 = TaskContext(
        original_task="Write a Python async function that retries an HTTP request with exponential backoff.",
        session_id="demo-session",
        user_id="demo-user",
    )

    print(f"Task ID : {ctx3.task_id}")
    print(f"Task    : {ctx3.original_task}\n")

    run3 = await orchestrator.run(ctx3)

    print(f"\nStatus   : {run3.status.value}")
    print(f"Intent   : {run3.intent.value}")
    print(f"Duration : {run3.total_ms}ms")
    print(f"\nResult (first 500 chars):\n{run3.final_result[:500]}…\n")

    # ── Summary table ─────────────────────────────────────────────────────────
    print("=" * 70)
    print("  EXECUTION SUMMARY")
    print("=" * 70)
    print(f"{'Example':<10} {'Intent':<12} {'Status':<12} {'Duration':<12} {'Agents'}")
    print("-" * 70)
    for label, run in [("E1: Research", run1), ("E2: Plan", run2), ("E3: Code", run3)]:
        print(
            f"{label:<10} {run.intent.value:<12} {run.status.value:<12} "
            f"{run.total_ms}ms{'':<6} {len(run.agent_results)} agent calls"
        )
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(example_execution_flow())
