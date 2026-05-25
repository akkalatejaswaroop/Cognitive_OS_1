"""
Task Graph — DAG tracking for multi-step agent pipelines.
The PlanningAgent produces a TaskGraph; the OrchestratorAgent executes it.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.schemas.agent import SubTask, TaskGraph

logger = logging.getLogger(__name__)


class TaskGraphRunner:
    """
    Executes a TaskGraph produced by the PlanningAgent.

    - Subtasks with no dependencies run immediately (in parallel via asyncio.gather).
    - Subtasks with dependencies wait until all predecessors have status="completed".
    - If a predecessor fails, dependent subtasks are marked "skipped".
    """

    def __init__(self, graph: TaskGraph, delegate_fn):
        """
        Args:
            graph:        The TaskGraph to run.
            delegate_fn:  Coroutine  async (sub_task: SubTask) -> str
                          Implemented by OrchestratorAgent to publish to bus.
        """
        self.graph = graph
        self.delegate_fn = delegate_fn
        self._results: dict[str, Any] = {}   # sub_task_id → result

    # ------------------------------------------------------------------ #
    #  Public entry point                                                 #
    # ------------------------------------------------------------------ #
    async def run(self) -> dict[str, Any]:
        """Execute all subtasks in dependency order. Returns results by sub_task_id."""
        pending = list(self.graph.subtasks)
        completed_ids: set[str] = set()
        failed_ids: set[str] = set()

        while pending:
            # Find subtasks whose dependencies are all resolved
            ready = [
                st for st in pending
                if all(dep in completed_ids for dep in st.depends_on)
                and not any(dep in failed_ids for dep in st.depends_on)
            ]
            skippable = [
                st for st in pending
                if any(dep in failed_ids for dep in st.depends_on)
            ]

            # Skip subtasks whose prerequisite failed
            for st in skippable:
                st.status = "skipped"
                failed_ids.add(st.sub_task_id)
                pending.remove(st)
                logger.warning(f"Skipping subtask {st.sub_task_id} — dependency failed")

            if not ready:
                if not pending:
                    break
                # Guard against infinite loop if graph is malformed
                logger.error("TaskGraph deadlock: no subtasks are ready but pending is non-empty")
                break

            # Execute ready subtasks in parallel
            tasks = [self._run_subtask(st) for st in ready]
            await asyncio.gather(*tasks, return_exceptions=True)

            for st in ready:
                pending.remove(st)
                if st.status == "completed":
                    completed_ids.add(st.sub_task_id)
                else:
                    failed_ids.add(st.sub_task_id)

        return self._results

    # ------------------------------------------------------------------ #
    #  Internal                                                           #
    # ------------------------------------------------------------------ #
    async def _run_subtask(self, subtask: SubTask) -> None:
        """Delegate a single subtask and record the result."""
        subtask.status = "processing"
        try:
            result = await self.delegate_fn(subtask)
            subtask.result = result
            subtask.status = "completed"
            self._results[subtask.sub_task_id] = result
            logger.info(f"SubTask {subtask.sub_task_id} ({subtask.agent}) completed.")
        except Exception as exc:
            subtask.status = "failed"
            subtask.error = str(exc)
            self._results[subtask.sub_task_id] = f"ERROR: {exc}"
            logger.error(f"SubTask {subtask.sub_task_id} failed: {exc}")
