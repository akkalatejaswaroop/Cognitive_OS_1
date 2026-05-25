"""
Cognitive OS — LLM Provider Abstraction Layer
Swap between Ollama (local), OpenAI, and IBM Granite via factory.
"""
from app.llm.base import LLMProvider
from app.llm.factory import get_llm_provider

__all__ = ["LLMProvider", "get_llm_provider"]
