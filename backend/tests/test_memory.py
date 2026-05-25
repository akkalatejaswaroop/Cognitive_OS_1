"""
Unit tests for memory layer: ChromaStore and Embedder.
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock


class TestChromaStore:
    def _make_store(self, mock_collection):
        """Helper: create a ChromaStore with a mocked collection."""
        mock_client = MagicMock()
        mock_client.get_or_create_collection.return_value = mock_collection

        with patch("app.core.database.chroma_client", mock_client):
            from app.memory.chroma_store import ChromaStore
            store = ChromaStore.__new__(ChromaStore)
            store.collection_name = "test_collection"
            store._collection = mock_collection
            return store

    def test_store_returns_doc_id(self):
        col = MagicMock()
        col.upsert = MagicMock()
        store = self._make_store(col)

        doc_id = store.store("test content", {"user_id": "user1"})
        assert doc_id is not None
        assert len(doc_id) > 0
        col.upsert.assert_called_once()

    def test_store_without_chromadb_returns_none(self):
        with patch("app.core.database.chroma_client", None):
            from app.memory.chroma_store import ChromaStore
            store = ChromaStore.__new__(ChromaStore)
            store._collection = None
            result = store.store("content")
            assert result is None

    def test_recall_returns_list(self):
        col = MagicMock()
        col.query = MagicMock(return_value={
            "ids": [["id1", "id2"]],
            "documents": [["doc1", "doc2"]],
            "metadatas": [[{"user_id": "u1"}, {"user_id": "u1"}]],
            "distances": [[0.1, 0.3]],
        })
        store = self._make_store(col)
        results = store.recall("python best practices")
        assert len(results) == 2
        assert results[0]["document"] == "doc1"
        assert results[0]["distance"] == 0.1

    def test_recall_without_chromadb_returns_empty(self):
        from app.memory.chroma_store import ChromaStore
        store = ChromaStore.__new__(ChromaStore)
        store._collection = None
        assert store.recall("query") == []

    def test_delete_calls_collection(self):
        col = MagicMock()
        col.delete = MagicMock()
        store = self._make_store(col)
        result = store.delete("doc-id-123")
        assert result is True
        col.delete.assert_called_once_with(ids=["doc-id-123"])

    def test_count_returns_int(self):
        col = MagicMock()
        col.count = MagicMock(return_value=42)
        store = self._make_store(col)
        assert store.count() == 42

    def test_count_without_chromadb_returns_zero(self):
        from app.memory.chroma_store import ChromaStore
        store = ChromaStore.__new__(ChromaStore)
        store._collection = None
        assert store.count() == 0


class TestEmbedder:
    @pytest.mark.asyncio
    async def test_embed_delegates_to_provider(self):
        mock_provider = AsyncMock()
        mock_provider.embed = AsyncMock(return_value=[0.1, 0.2, 0.3])

        with patch("app.llm.factory.get_llm_provider", return_value=mock_provider):
            from app.memory.embedder import Embedder
            embedder = Embedder()
            embedder._provider = mock_provider
            vec = await embedder.embed("hello world")
            assert vec == [0.1, 0.2, 0.3]
            mock_provider.embed.assert_called_once_with("hello world")

    @pytest.mark.asyncio
    async def test_embed_returns_empty_on_failure(self):
        mock_provider = AsyncMock()
        mock_provider.embed = AsyncMock(side_effect=RuntimeError("embed failed"))

        with patch("app.llm.factory.get_llm_provider", return_value=mock_provider):
            from app.memory.embedder import Embedder
            embedder = Embedder()
            embedder._provider = mock_provider
            vec = await embedder.embed("hello world")
            assert vec == []

    @pytest.mark.asyncio
    async def test_embed_batch(self):
        mock_provider = AsyncMock()
        mock_provider.embed = AsyncMock(side_effect=lambda t: [len(t) * 0.01] * 4)

        with patch("app.llm.factory.get_llm_provider", return_value=mock_provider):
            from app.memory.embedder import Embedder
            embedder = Embedder()
            embedder._provider = mock_provider
            results = await embedder.embed_batch(["hello", "world"])
            assert len(results) == 2
