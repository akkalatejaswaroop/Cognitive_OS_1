"""
Tool Registry — register, discover, and invoke tools for the Execution Agent.
"""
from __future__ import annotations

import logging
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)


class Tool:
    """Descriptor for a single tool."""

    def __init__(
        self,
        name: str,
        description: str,
        fn: Callable[..., Awaitable[Any]],
    ):
        self.name = name
        self.description = description
        self.fn = fn

    async def invoke(self, **kwargs: Any) -> Any:
        return await self.fn(**kwargs)


class ToolRegistry:
    """Central registry of all tools available to the Execution Agent."""

    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, name: str, description: str, fn: Callable) -> None:
        self._tools[name] = Tool(name=name, description=description, fn=fn)
        logger.info(f"[ToolRegistry] Registered tool: {name}")

    async def invoke(self, name: str, **kwargs: Any) -> Any:
        if name not in self._tools:
            raise ValueError(f"Tool '{name}' is not registered.")
        logger.info(f"[ToolRegistry] Invoking: {name} kwargs={list(kwargs.keys())}")
        return await self._tools[name].invoke(**kwargs)

    def list_tools(self) -> list[dict[str, str]]:
        return [{"name": t.name, "description": t.description} for t in self._tools.values()]

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)


# ── Global singleton ─────────────────────────────────────────────────────────
tool_registry = ToolRegistry()
