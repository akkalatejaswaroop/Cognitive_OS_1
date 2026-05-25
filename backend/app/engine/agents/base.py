"""
BaseAgent — enhanced with retry logic, circuit-breaker integration,
and lifecycle hooks. Fully backward-compatible with existing agents.
"""
from __future__ import annotations

import logging
from typing import Any

from app.orchestration.bus import event_bus, AgentMessage
from app.orchestration.circuit_breaker import circuit_registry
from app.orchestration.retry import exponential_backoff
from app.core.config import settings

logger = logging.getLogger(__name__)

_MAX_RETRIES = int(getattr(settings, "AGENT_RETRY_MAX", 3))
_TIMEOUT = int(getattr(settings, "AGENT_TIMEOUT_SECONDS", 120))


class BaseAgent:
    """
    Base class for all Cognitive OS agents.

    Responsibilities:
    - Auto-subscribe to `agent.<name>` topic on the EventBus.
    - Wrap `execute()` with retry + circuit-breaker logic.
    - Emit structured status events to `task.status.<task_id>` and `task.global_status`.
    """

    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        self.task_metadata: dict[str, Any] = {}
        self._circuit = circuit_registry.get(name)

        # Auto-subscribe
        event_bus.subscribe(f"agent.{self.name}", self._handle_event)
        logger.info(f"[{self.name}] Agent registered (role: {self.role})")

    # ------------------------------------------------------------------ #
    #  Event handler                                                      #
    # ------------------------------------------------------------------ #

    async def _handle_event(self, message: AgentMessage) -> None:
        payload = message.payload
        task_id = payload.get("task_id", "unknown")
        task = payload.get("task", "")
        parent_id = payload.get("parent_id")
        session_id = payload.get("session_id", "default")
        user_id = payload.get("user_id")

        logger.info(f"[{self.name}] Received task {task_id}")

        # Store context for use in execute()
        self.task_metadata[task_id] = {
            "parent_id": parent_id,
            "session_id": session_id,
            "user_id": user_id,
        }

        # Circuit breaker check
        if self._circuit.is_open():
            logger.warning(f"[{self.name}] Circuit OPEN — rejecting task {task_id}")
            await self.emit_status(
                task_id,
                "failed",
                f"{self.name} is temporarily unavailable (circuit open).",
                parent_id=parent_id,
            )
            return

        await self.emit_status(task_id, "processing", f"{self.name} is starting…", parent_id=parent_id)

        try:
            result = await exponential_backoff(
                lambda: self.execute(task, task_id),
                max_retries=_MAX_RETRIES,
                label=f"{self.name}:{task_id}",
            )
            self._circuit.record_success()
            await self.emit_status(
                task_id, "completed", f"{self.name} completed.", result=result, parent_id=parent_id
            )
        except Exception as exc:
            self._circuit.record_failure()
            logger.error(f"[{self.name}] Task {task_id} failed after retries: {exc}")
            await self.on_failure(task_id, exc, parent_id)
        finally:
            self.task_metadata.pop(task_id, None)

    # ------------------------------------------------------------------ #
    #  Override in subclasses                                             #
    # ------------------------------------------------------------------ #

    async def execute(self, task: str, task_id: str | None = None) -> str:
        raise NotImplementedError("Subclasses must implement execute()")

    async def on_failure(self, task_id: str, exc: Exception, parent_id: str | None) -> None:
        """Called when all retries are exhausted. Override for custom behaviour."""
        await self.emit_status(task_id, "failed", str(exc), parent_id=parent_id)

    async def on_shutdown(self) -> None:
        """Graceful deregistration. Called by main.py on shutdown."""
        event_bus.unsubscribe(f"agent.{self.name}", self._handle_event)
        logger.info(f"[{self.name}] Deregistered from event bus.")

    # ------------------------------------------------------------------ #
    #  Status emission                                                    #
    # ------------------------------------------------------------------ #

    async def emit_status(
        self,
        task_id: str,
        status: str,
        message: str,
        result: Any = None,
        parent_id: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "task_id": task_id,
            "agent": self.name,
            "status": status,
            "message": message,
            "result": result,
        }
        if parent_id:
            payload["parent_id"] = parent_id

        await event_bus.publish(f"task.status.{task_id}", payload)
        await event_bus.publish("task.global_status", payload)

    # ------------------------------------------------------------------ #
    #  Helpers for subclasses                                             #
    # ------------------------------------------------------------------ #

    def _get_meta(self, task_id: str, key: str) -> Any | None:
        return self.task_metadata.get(task_id, {}).get(key)
