import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class OllamaService:
    """
    LLM service backed by a local Ollama instance.
    Ollama exposes an OpenAI-compatible /api/chat endpoint.
    """

    @property
    def base_url(self) -> str:
        return f"{settings.OLLAMA_BASE_URL}/api/chat"

    async def generate_response(
        self,
        prompt: str,
        model: str = "",
        system_prompt: str = "",
    ) -> str:
        """Call Ollama and return the assistant's text reply."""
        chosen_model = model or settings.OLLAMA_DEFAULT_MODEL

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": chosen_model,
            "messages": messages,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["message"]["content"]
        except httpx.ConnectError:
            msg = (
                f"Cannot connect to Ollama at {settings.OLLAMA_BASE_URL}. "
                "Make sure `ollama serve` is running."
            )
            logger.error(msg)
            raise RuntimeError(msg)
        except Exception as e:
            logger.error(f"Error calling Ollama API: {e}")
            raise

    async def list_models(self) -> list[str]:
        """Return model names available on the local Ollama instance."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                resp.raise_for_status()
                return [m["name"] for m in resp.json().get("models", [])]
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {e}")
            return []


# ---------------------------------------------------------------------------
# Backwards-compat alias — existing code importing OpenRouterService still works
# ---------------------------------------------------------------------------
OpenRouterService = OllamaService
