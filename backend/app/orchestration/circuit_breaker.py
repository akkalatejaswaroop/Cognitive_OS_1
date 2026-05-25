"""
Circuit Breaker — per-agent failure monitoring.

States:
  CLOSED    — normal operation; failures are counted.
  OPEN      — agent is considered unhealthy; calls are rejected immediately.
  HALF_OPEN — probe state; one trial call allowed to test recovery.

Thresholds are read from settings (with sensible defaults).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from enum import Enum

logger = logging.getLogger(__name__)


class CBState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreaker:
    """
    Single-agent circuit breaker.

    Args:
        agent_name:         Human-readable label (for logs).
        failure_threshold:  Number of failures before opening.
        reset_timeout_s:    Seconds in OPEN state before trying HALF_OPEN.
    """

    def __init__(
        self,
        agent_name: str,
        failure_threshold: int = 3,
        reset_timeout_s: int = 30,
    ):
        self.agent_name = agent_name
        self.failure_threshold = failure_threshold
        self.reset_timeout = timedelta(seconds=reset_timeout_s)

        self._state = CBState.CLOSED
        self._failure_count = 0
        self._last_failure_at: datetime | None = None
        self._last_success_at: datetime | None = None

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    @property
    def state(self) -> CBState:
        self._maybe_transition_to_half_open()
        return self._state

    def is_open(self) -> bool:
        return self.state == CBState.OPEN

    def record_success(self) -> None:
        self._last_success_at = datetime.now(timezone.utc)
        if self._state in (CBState.HALF_OPEN, CBState.OPEN):
            logger.info(f"[CircuitBreaker:{self.agent_name}] Recovered → CLOSED")
        self._state = CBState.CLOSED
        self._failure_count = 0

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_at = datetime.now(timezone.utc)

        if self._state == CBState.HALF_OPEN:
            # Probe failed — reopen
            self._state = CBState.OPEN
            logger.warning(
                f"[CircuitBreaker:{self.agent_name}] Probe failed → OPEN"
            )
            return

        if self._failure_count >= self.failure_threshold:
            self._state = CBState.OPEN
            logger.error(
                f"[CircuitBreaker:{self.agent_name}] "
                f"{self._failure_count} failures → OPEN"
            )

    def to_dict(self) -> dict:
        return {
            "name": self.agent_name,
            "state": self.state.value,
            "failure_count": self._failure_count,
            "last_failure_at": (
                self._last_failure_at.isoformat()
                if self._last_failure_at
                else None
            ),
            "last_success_at": (
                self._last_success_at.isoformat()
                if self._last_success_at
                else None
            ),
        }

    # ------------------------------------------------------------------ #
    #  Internal                                                           #
    # ------------------------------------------------------------------ #

    def _maybe_transition_to_half_open(self) -> None:
        if self._state == CBState.OPEN and self._last_failure_at:
            elapsed = datetime.now(timezone.utc) - self._last_failure_at
            if elapsed >= self.reset_timeout:
                self._state = CBState.HALF_OPEN
                logger.info(
                    f"[CircuitBreaker:{self.agent_name}] Reset timeout elapsed → HALF_OPEN"
                )


# ── Registry of all circuit breakers ────────────────────────────────────────

class CircuitBreakerRegistry:
    """Holds one CircuitBreaker per agent name."""

    def __init__(self, failure_threshold: int = 3, reset_timeout_s: int = 30):
        self._breakers: dict[str, CircuitBreaker] = {}
        self._threshold = failure_threshold
        self._timeout = reset_timeout_s

    def get(self, agent_name: str) -> CircuitBreaker:
        if agent_name not in self._breakers:
            self._breakers[agent_name] = CircuitBreaker(
                agent_name,
                failure_threshold=self._threshold,
                reset_timeout_s=self._timeout,
            )
        return self._breakers[agent_name]

    def all_states(self) -> list[dict]:
        return [cb.to_dict() for cb in self._breakers.values()]


# Global singleton
circuit_registry = CircuitBreakerRegistry()
