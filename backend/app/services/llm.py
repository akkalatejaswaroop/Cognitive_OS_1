"""
Backward-compatibility shim.
Legacy code importing OllamaService or OpenRouterService from this module still works.
All new code should import from app.llm.factory via get_llm_provider().
"""
from app.llm.ollama import OllamaService  # noqa: F401

# Legacy alias
OpenRouterService = OllamaService
