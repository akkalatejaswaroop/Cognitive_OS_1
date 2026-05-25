"""
Abstract base class for all LLM providers in Cognitive OS.
Every provider must implement generate() and embed().
"""
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Contract all LLM backends must satisfy."""

    # ------------------------------------------------------------------ #
    #  Text generation                                                    #
    # ------------------------------------------------------------------ #
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Return assistant reply as plain text."""
        ...

    # ------------------------------------------------------------------ #
    #  Embeddings                                                         #
    # ------------------------------------------------------------------ #
    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Return a dense float vector for the given text."""
        ...

    # ------------------------------------------------------------------ #
    #  Optional: model listing                                            #
    # ------------------------------------------------------------------ #
    async def list_models(self) -> list[str]:
        """Return available model names (best-effort)."""
        return []
