"""
Agent Registry — tracks all live agents and exposes health status.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class AgentRegistry:
    """Singleton that holds references to all running agent instances."""

    _instance: "AgentRegistry | None" = None

    def __init__(self):
        self._agents: dict[str, "BaseAgent"] = {}

    @classmethod
    def get(cls) -> "AgentRegistry":
        if cls._instance is None:
            cls._instance = AgentRegistry()
        return cls._instance

    def register(self, agent: "BaseAgent") -> None:
        self._agents[agent.name] = agent
        logger.info(f"[AgentRegistry] Registered: {agent.name}")

    def get_agent(self, name: str) -> "BaseAgent | None":
        return self._agents.get(name)

    def all_agents(self) -> list["BaseAgent"]:
        return list(self._agents.values())

    def health_report(self) -> list[dict]:
        from app.orchestration.circuit_breaker import circuit_registry
        return circuit_registry.all_states()

    def agent_names(self) -> list[str]:
        return list(self._agents.keys())
