"""
OpenAI LLM Provider — gpt-4o for generation, text-embedding-3-small for embeddings.
Activated automatically when OPENAI_API_KEY is set in environment.
"""
import logging
import httpx
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)

OPENAI_API_BASE = "https://api.openai.com/v1"


class OpenAIProvider(LLMProvider):
    """
    OpenAI-backed provider.
    Set OPENAI_API_KEY and optionally OPENAI_DEFAULT_MODEL in your .env.
    """

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model
        self.embed_model = "text-embedding-3-small"
        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

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
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{OPENAI_API_BASE}/chat/completions",
                json=payload,
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    # ------------------------------------------------------------------ #
    #  Embeddings                                                         #
    # ------------------------------------------------------------------ #
    async def embed(self, text: str) -> list[float]:
        payload = {"model": self.embed_model, "input": text}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OPENAI_API_BASE}/embeddings",
                json=payload,
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]

    # ------------------------------------------------------------------ #
    #  Model listing                                                      #
    # ------------------------------------------------------------------ #
    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{OPENAI_API_BASE}/models", headers=self._headers
                )
                resp.raise_for_status()
                return [m["id"] for m in resp.json().get("data", [])]
        except Exception as e:
            logger.warning(f"Could not list OpenAI models: {e}")
            return []
