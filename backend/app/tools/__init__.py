"""Tools package init — registers built-in tools on import."""
from app.tools.registry import tool_registry
from app.tools.web_search import web_search
from app.tools.code_runner import run_code

# Register built-in tools
tool_registry.register(
    name="web_search",
    description="Search the web for current information using Tavily Search API.",
    fn=web_search,
)

tool_registry.register(
    name="run_code",
    description="Execute a Python code snippet in a sandboxed subprocess and return stdout/stderr.",
    fn=run_code,
)

__all__ = ["tool_registry"]
