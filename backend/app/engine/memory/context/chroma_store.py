"""
ChromaDB store — high-level wrapper used by MemoryAgent.
Handles collection management, upsert, similarity search, and deletion.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from app.core.database import chroma_client

logger = logging.getLogger(__name__)

_DEFAULT_COLLECTION = "cognitive_memory"
_DEFAULT_TOP_K = 5
_DEFAULT_THRESHOLD = 0.4   # ChromaDB distance threshold (lower = more similar)


class ChromaStore:
    """
    Thin, resilient wrapper around ChromaDB HttpClient.

    All methods are no-ops and return safe defaults when ChromaDB is unavailable,
    so the rest of the system continues to function without a vector store.
    """

    def __init__(self, collection_name: str = _DEFAULT_COLLECTION):
        self.collection_name = collection_name
        self._collection = None

        if chroma_client:
            try:
                self._collection = chroma_client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"},
                )
                logger.info(f"ChromaStore ready — collection: '{collection_name}'")
            except Exception as exc:
                logger.warning(f"ChromaStore init failed: {exc}")

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def store(
        self,
        content: str,
        metadata: dict[str, Any] | None = None,
        doc_id: str | None = None,
    ) -> str | None:
        """
        Upsert a document into the collection.

        Returns the doc_id on success, None if ChromaDB is unavailable.
        """
        if not self._collection:
            return None

        _id = doc_id or str(uuid.uuid4())
        _meta = metadata or {"source": "system"}

        try:
            self._collection.upsert(
                ids=[_id],
                documents=[content],
                metadatas=[_meta],
            )
            return _id
        except Exception as exc:
            logger.error(f"ChromaStore.store failed: {exc}")
            return None

    def recall(
        self,
        query: str,
        top_k: int = _DEFAULT_TOP_K,
        where: dict | None = None,
    ) -> list[dict[str, Any]]:
        """
        Similarity search. Returns a list of {id, document, metadata, distance} dicts.
        Returns [] if ChromaDB is unavailable or no results found.
        """
        if not self._collection:
            return []

        try:
            kwargs: dict[str, Any] = {
                "query_texts": [query],
                "n_results": top_k,
                "include": ["documents", "metadatas", "distances"],
            }
            if where:
                kwargs["where"] = where

            raw = self._collection.query(**kwargs)
            results = []
            for i, doc_id in enumerate(raw["ids"][0]):
                results.append(
                    {
                        "id": doc_id,
                        "document": raw["documents"][0][i],
                        "metadata": raw["metadatas"][0][i],
                        "distance": raw["distances"][0][i],
                    }
                )
            return results
        except Exception as exc:
            logger.error(f"ChromaStore.recall failed: {exc}")
            return []

    def delete(self, doc_id: str) -> bool:
        """Delete a document by ID. Returns True on success."""
        if not self._collection:
            return False
        try:
            self._collection.delete(ids=[doc_id])
            return True
        except Exception as exc:
            logger.error(f"ChromaStore.delete failed: {exc}")
            return False

    def count(self) -> int:
        """Return total document count in the collection."""
        if not self._collection:
            return 0
        try:
            return self._collection.count()
        except Exception:
            return 0
