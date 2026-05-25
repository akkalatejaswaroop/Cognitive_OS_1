"""
Embedder — dispatch to the correct embedding backend.

Priority: OpenAI text-embedding-3-small → Ollama nomic-embed-text → zero-vector fallback.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)


class Embedder:
    """
    Thin wrapper that delegates to the active LLM provider's embed() method.
    Using the global LLM provider means embedding and generation share the
    same backend selection (Ollama / OpenAI / Granite).
    """

    def __init__(self):
        from app.llm.factory import get_llm_provider
        self._provider = get_llm_provider()

    async def embed(self, text: str) -> list[float]:
        """Return a dense float vector. Returns [] on failure."""
        try:
            return await self._provider.embed(text)
        except Exception as exc:
            logger.warning(f"Embedding failed: {exc}. Returning empty vector.")
            return []

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts sequentially (rate-limit safe)."""
        results = []
        for text in texts:
            vec = await self.embed(text)
            results.append(vec)
        return results


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    """Singleton embedder instance."""
    return Embedder()
