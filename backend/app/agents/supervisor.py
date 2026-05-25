"""
Orchestrator Agent (SupervisorAgent) — routes, coordinates, and synthesises
the full six-agent Cognitive OS pipeline.

Upgrade from v1:
  - Multi-intent routing (research / code / plan / memory / execute / summarise)
  - TaskGraph execution via PlanningAgent for complex goals
  - Memory context injection via MemoryAgent
  - SummaryAgent for final output distillation
  - Circuit-breaker awareness via BaseAgent
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

from app.agents.base import BaseAgent
from app.llm.factory import get_llm_provider
from app.orchestration.bus import event_bus
from app.orchestration.task_graph import TaskGraphRunner
from app.prompts.orchestrator import ORCHESTRATOR_INTENT, ORCHESTRATOR_SYNTHESIS
from app.schemas.agent import SubTask, TaskGraph

logger = logging.getLogger(__name__)

# Intent → target agent mapping
_INTENT_MAP: dict[str, str] = {
    "research":  "research-agent",
    "code":      "execution-agent",
    "execute":   "execution-agent",
    "memory":    "memory-agent",
    "summarise": "summary-agent",
    "summarize": "summary-agent",
    "plan":      "planning-agent",
}

# Keyword fallback classifier (when LLM call fails)
_CODE_KEYWORDS = {
    "code", "program", "script", "develop", "debug", "compile", "bug",
    "function", "class", "react", "next.js", "python", "javascript",
    "html", "css", "database", "sql", "api", "backend", "frontend",
    "git", "repo", "test", "pytest", "refactor", "docker", "endpoint",
    "implement", "build", "write", "generate code",
}
_PLAN_KEYWORDS = {
    "plan", "steps", "roadmap", "workflow", "pipeline", "sequence",
    "step by step", "how do i", "guide me", "phases",
}
_MEMORY_KEYWORDS = {"remember", "recall", "forget", "memory", "what did i say"}


class SupervisorAgent(BaseAgent):
    """
    Central Orchestrator of Cognitive OS.

    Simple tasks: intent → single agent → synthesise.
    Complex tasks ('plan' intent): Planning Agent → TaskGraph → parallel execution → SummaryAgent.
    """

    def __init__(self):
        super().__init__(name="supervisor", role="Central Orchestrator")
        self._llm = get_llm_provider()

    # ------------------------------------------------------------------ #
    #  Main execute                                                       #
    # ------------------------------------------------------------------ #

    async def execute(self, task: str, task_id: str | None = None) -> str:
        task_id = task_id or str(uuid.uuid4())
        parent_id = self._get_meta(task_id, "parent_id")
        session_id = self._get_meta(task_id, "session_id") or "default"
        user_id = self._get_meta(task_id, "user_id")

        # ── 1. Inject memory context ──────────────────────────────────────
        await self.emit_status(task_id, "thinking", "Retrieving relevant context…", parent_id=parent_id)
        memory_context = await self._fetch_memory(task, task_id, session_id, user_id)

        enriched_task = task
        if memory_context and memory_context != "No relevant prior context found.":
            enriched_task = f"[Context from memory]\n{memory_context}\n\n[User request]\n{task}"

        # ── 2. Classify intent ────────────────────────────────────────────
        await self.emit_status(task_id, "thinking", "Classifying intent…", parent_id=parent_id)
        intent = await self._classify_intent(enriched_task)
        logger.info(f"[supervisor] Task {task_id} → intent: {intent}")

        # ── 3. Route ──────────────────────────────────────────────────────
        if intent == "plan":
            result = await self._run_planned_pipeline(enriched_task, task_id, parent_id)
        else:
            target_agent = _INTENT_MAP.get(intent, "research-agent")
            await self.emit_status(
                task_id,
                "thinking",
                f"Delegating to {target_agent}…",
                parent_id=parent_id,
            )
            result = await self.delegate_and_await(target_agent, enriched_task, task_id)

        # ── 4. Synthesise final response ──────────────────────────────────
        await self.emit_status(task_id, "thinking", "Synthesising final response…", parent_id=parent_id)
        final = await self._synthesise(task, result)

        # ── 5. Store outcome in memory (fire and forget) ──────────────────
        asyncio.create_task(
            self._store_outcome(task, final, task_id, session_id, user_id)
        )

        return final

    # ------------------------------------------------------------------ #
    #  Intent classification                                              #
    # ------------------------------------------------------------------ #

    async def _classify_intent(self, task: str) -> str:
        try:
            raw = await self._llm.generate(
                prompt=task,
                system=ORCHESTRATOR_INTENT,
                temperature=0.0,
            )
            intent = raw.strip().lower().split()[0] if raw.strip() else "research"
            return intent if intent in _INTENT_MAP else "research"
        except Exception as exc:
            logger.warning(f"LLM intent classification failed: {exc}. Using keyword fallback.")
            return self._keyword_classify(task)

    def _keyword_classify(self, task: str) -> str:
        words = set(task.lower().split())
        if any(kw in task.lower() for kw in _PLAN_KEYWORDS):
            return "plan"
        if any(kw in task.lower() for kw in _MEMORY_KEYWORDS):
            return "memory"
        if any(w in _CODE_KEYWORDS or any(kw in w for kw in _CODE_KEYWORDS) for w in words):
            return "code"
        return "research"

    # ------------------------------------------------------------------ #
    #  Planned pipeline (multi-step)                                     #
    # ------------------------------------------------------------------ #

    async def _run_planned_pipeline(
        self, task: str, task_id: str, parent_id: str | None
    ) -> str:
        await self.emit_status(
            task_id, "thinking", "Building task plan…", parent_id=parent_id
        )

        # Ask PlanningAgent to decompose the task
        plan_json = await self.delegate_and_await("planning-agent", task, task_id)

        try:
            graph = TaskGraph.model_validate_json(plan_json)
        except Exception as exc:
            logger.warning(f"Could not parse TaskGraph: {exc}. Falling back to research.")
            return await self.delegate_and_await("research-agent", task, task_id)

        await self.emit_status(
            task_id,
            "thinking",
            f"Executing {len(graph.subtasks)} planned subtask(s)…",
            parent_id=parent_id,
        )

        # Execute the graph
        runner = TaskGraphRunner(graph=graph, delegate_fn=self._delegate_subtask)
        results = await runner.run()

        # Aggregate all results for the SummaryAgent
        aggregated = "\n\n".join(
            f"### Step {i+1}: {st.description}\n{results.get(st.sub_task_id, 'No output')}"
            for i, st in enumerate(graph.subtasks)
        )

        await self.emit_status(
            task_id, "thinking", "Requesting summary…", parent_id=parent_id
        )
        return await self.delegate_and_await("summary-agent", aggregated, task_id)

    async def _delegate_subtask(self, subtask: SubTask) -> str:
        """Adapter used by TaskGraphRunner."""
        return await self.delegate_and_await(
            subtask.agent, subtask.description, subtask.sub_task_id
        )

    # ------------------------------------------------------------------ #
    #  Delegation utilities                                               #
    # ------------------------------------------------------------------ #

    async def delegate_and_await(
        self, sub_agent: str, sub_task: str, parent_task_id: str
    ) -> str:
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        future: asyncio.Future = asyncio.Future()

        async def status_callback(payload: dict) -> None:
            status = payload.get("status")
            if status == "completed" and not future.done():
                future.set_result(payload.get("result", ""))
            elif status == "failed" and not future.done():
                future.set_exception(
                    Exception(payload.get("message", "Subtask failed"))
                )

        event_bus.subscribe(f"task.status.{sub_task_id}", status_callback)

        try:
            await event_bus.publish(f"agent.{sub_agent}", {
                "task_id": sub_task_id,
                "task": sub_task,
                "parent_id": parent_task_id,
            })
            return await asyncio.wait_for(future, timeout=120.0)
        except asyncio.TimeoutError:
            raise Exception(f"Agent {sub_agent} timed out on task {sub_task_id}")
        finally:
            event_bus.unsubscribe(f"task.status.{sub_task_id}", status_callback)

    # ── Legacy non-blocking delegate (backward compatibility) ────────────
    async def delegate_task(
        self, sub_agent: str, sub_task: str, parent_task_id: str
    ) -> None:
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        await event_bus.publish(f"agent.{sub_agent}", {
            "task_id": sub_task_id,
            "task": sub_task,
            "parent_id": parent_task_id,
        })

    # ------------------------------------------------------------------ #
    #  Memory integration                                                 #
    # ------------------------------------------------------------------ #

    async def _fetch_memory(
        self, query: str, task_id: str, session_id: str, user_id: str | None
    ) -> str:
        try:
            return await self.delegate_and_await(
                "memory-agent", f"RECALL:{query}", task_id
            )
        except Exception as exc:
            logger.warning(f"Memory recall failed: {exc}")
            return ""

    async def _store_outcome(
        self,
        original_task: str,
        result: str,
        task_id: str,
        session_id: str,
        user_id: str | None,
    ) -> None:
        try:
            content = f"Task: {original_task}\nResult: {result[:500]}"
            await event_bus.publish("agent.memory-agent", {
                "task_id": f"{task_id}-mem-store",
                "task": f"STORE:{content}",
                "parent_id": task_id,
                "user_id": user_id,
                "session_id": session_id,
            })
        except Exception as exc:
            logger.warning(f"Memory store after task failed: {exc}")

    # ------------------------------------------------------------------ #
    #  Synthesis                                                          #
    # ------------------------------------------------------------------ #

    async def _synthesise(self, original_task: str, agent_result: str) -> str:
        try:
            return await self._llm.generate(
                prompt=(
                    f"Original user request:\n{original_task}\n\n"
                    f"Agent findings:\n{agent_result}"
                ),
                system=ORCHESTRATOR_SYNTHESIS,
            )
        except Exception as exc:
            logger.warning(f"Synthesis LLM call failed: {exc}. Returning raw result.")
            return agent_result
