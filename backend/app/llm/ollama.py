"""
Ollama LLM Provider — wraps local Ollama inference server.
Implements the LLMProvider interface so it's swappable.
"""
import logging
import httpx
from app.llm.base import LLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaProvider(LLMProvider):
    """
    Local Ollama inference. Requires `ollama serve` running on
    settings.OLLAMA_BASE_URL (default: http://localhost:11434).
    """

    def __init__(self, base_url: str | None = None, model: str | None = None):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_DEFAULT_MODEL
        self.embed_model = settings.OLLAMA_EMBED_MODEL

    # ------------------------------------------------------------------ #
    #  Text generation                                                    #
    # ------------------------------------------------------------------ #
    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"]

    # ------------------------------------------------------------------ #
    #  Embeddings                                                         #
    # ------------------------------------------------------------------ #
    async def embed(self, text: str) -> list[float]:
        payload = {"model": self.embed_model, "prompt": text}
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{self.base_url}/api/embeddings", json=payload)
            resp.raise_for_status()
            return resp.json()["embedding"]

    # ------------------------------------------------------------------ #
    #  Model listing                                                      #
    # ------------------------------------------------------------------ #
    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                return [m["name"] for m in resp.json().get("models", [])]
        except Exception as e:
            logger.warning(f"Could not list Ollama models: {e}")
            return []


# ── Backward-compat shim ────────────────────────────────────────────────────
# Existing code that imports OllamaService from services.llm still works.
class OllamaService(OllamaProvider):
    """Legacy alias preserved for backward compatibility."""

    async def generate_response(
        self, prompt: str, system_prompt: str = "", model: str = ""
    ) -> str:
        if model:
            self.model = model
        return await self.generate(prompt=prompt, system=system_prompt)
