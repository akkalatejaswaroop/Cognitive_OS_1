"""
Workflow Executor — hydrates a WorkflowDefinition from the DB and runs it
step-by-step via the Orchestrator's event bus.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from app.orchestration.bus import event_bus
from app.workflows.base import WorkflowDefinition, WorkflowStep

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """
    Executes a WorkflowDefinition by dispatching each step as a task
    to the appropriate agent via the EventBus.

    Dependency resolution is handled locally (same logic as TaskGraphRunner)
    so that steps wait for their prerequisites before firing.
    """

    def __init__(self, workflow: WorkflowDefinition, parent_task_id: str):
        self.workflow = workflow
        self.parent_task_id = parent_task_id
        self._results: dict[str, Any] = {}   # step_id → result

    async def run(self) -> dict[str, Any]:
        pending = list(self.workflow.steps)
        completed: set[str] = set()
        failed: set[str] = set()

        while pending:
            ready = [
                step for step in pending
                if all(dep in completed for dep in step.depends_on)
                and not any(dep in failed for dep in step.depends_on)
            ]

            # Handle steps whose dependency failed
            for step in list(pending):
                if any(dep in failed for dep in step.depends_on):
                    if step.on_failure == "skip":
                        logger.warning(f"Skipping step '{step.step_id}' — dependency failed")
                        failed.add(step.step_id)
                        pending.remove(step)
                    elif step.on_failure == "stop":
                        logger.error(f"Workflow halted at step '{step.step_id}'")
                        return self._results

            if not ready:
                break

            # Execute ready steps in parallel
            await asyncio.gather(*[self._run_step(step) for step in ready])

            for step in ready:
                pending.remove(step)
                if step.step_id in self._results:
                    completed.add(step.step_id)
                else:
                    failed.add(step.step_id)

        return self._results

    async def _run_step(self, step: WorkflowStep) -> None:
        step_task_id = f"{self.parent_task_id}-wf-{step.step_id}"
        future: asyncio.Future = asyncio.Future()

        async def on_status(payload: dict) -> None:
            status = payload.get("status")
            if status == "completed" and not future.done():
                future.set_result(payload.get("result", ""))
            elif status == "failed" and not future.done():
                future.set_exception(Exception(payload.get("message", "Step failed")))

        event_bus.subscribe(f"task.status.{step_task_id}", on_status)

        try:
            await event_bus.publish(f"agent.{step.agent}", {
                "task_id": step_task_id,
                "task": step.instruction,
                "parent_id": self.parent_task_id,
            })
            result = await asyncio.wait_for(future, timeout=120.0)
            self._results[step.step_id] = result
        except asyncio.TimeoutError:
            logger.error(f"Step '{step.step_id}' timed out.")
        except Exception as exc:
            logger.error(f"Step '{step.step_id}' failed: {exc}")
        finally:
            event_bus.unsubscribe(f"task.status.{step_task_id}", on_status)
