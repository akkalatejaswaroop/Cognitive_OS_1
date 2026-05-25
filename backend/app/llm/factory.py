"""
LLM Provider Factory — returns the correct backend based on environment config.

Priority order:
  1. OpenAI  (if OPENAI_API_KEY set)
  2. IBM Granite  (if IBM_GRANITE_API_KEY + IBM_GRANITE_PROJECT_ID set)
  3. Ollama  (always-available local fallback)
"""
import logging
from functools import lru_cache
from app.llm.base import LLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    """
    Singleton factory — returns a cached LLMProvider instance.
    Agents call `get_llm_provider()` at construction time; swapping
    the provider requires only an env-var change and restart.
    """
    if getattr(settings, "OPENAI_API_KEY", ""):
        from app.llm.openai_provider import OpenAIProvider

        model = getattr(settings, "OPENAI_DEFAULT_MODEL", "gpt-4o")
        logger.info(f"LLM backend → OpenAI ({model})")
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY, model=model)

    if getattr(settings, "IBM_GRANITE_API_KEY", "") and getattr(
        settings, "IBM_GRANITE_PROJECT_ID", ""
    ):
        from app.llm.granite_provider import GraniteProvider

        logger.info("LLM backend → IBM Granite (Watsonx.ai)")
        return GraniteProvider(
            api_key=settings.IBM_GRANITE_API_KEY,
            project_id=settings.IBM_GRANITE_PROJECT_ID,
            endpoint=getattr(
                settings,
                "IBM_GRANITE_ENDPOINT",
                "https://us-south.ml.cloud.ibm.com",
            ),
            model=getattr(
                settings, "IBM_GRANITE_MODEL", "ibm/granite-3-3-8b-instruct"
            ),
        )

    # Default: local Ollama
    from app.llm.ollama import OllamaProvider

    logger.info(f"LLM backend -> Ollama ({settings.OLLAMA_DEFAULT_MODEL})")
    return OllamaProvider()
