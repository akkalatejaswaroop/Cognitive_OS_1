from app.core.database import chroma_client
import logging
import uuid

logger = logging.getLogger(__name__)

class MemoryService:
    def __init__(self, collection_name: str = "cognitive_memory"):
        # Gracefully handle database session being passed as positional argument
        if not isinstance(collection_name, str):
            collection_name = "cognitive_memory"
        self.collection_name = collection_name
        if chroma_client:
            self.collection = chroma_client.get_or_create_collection(name=collection_name)
        else:
            self.collection = None
            logger.warning("ChromaDB client not initialized. MemoryService will be inactive.")

    async def create_memory(self, user_id, content: str, memory_type: str = "episodic", importance_score: float = 0.5):
        """Creates a semantic memory with tenant-isolated metadata parameters."""
        metadata = {
            "user_id": str(user_id),
            "memory_type": memory_type,
            "importance_score": importance_score,
            "source": "sensory_capture"
        }
        return self.store_memory(content=content, metadata=metadata)

    def store_memory(self, content: str, metadata: dict = None):
        if not self.collection:
            return None
        
        doc_id = str(uuid.uuid4())
        try:
            self.collection.add(
                documents=[content],
                metadatas=[metadata] if metadata else [{"source": "system"}],
                ids=[doc_id]
            )
            return doc_id
        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            raise e

    def retrieve_memory(self, query: str, n_results: int = 3):
        if not self.collection:
            return []
            
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            return results
        except Exception as e:
            logger.error(f"Failed to retrieve memory: {e}")
            return []
