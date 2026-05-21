# ChromaDB Memory Engine Setup for Cognitive OS

This guide provides the complete setup for the ChromaDB-backed Memory Engine using OpenAI embeddings.

## 1. Installation
Ensure the following packages are installed in your backend environment:

```bash
pip install chromadb openai fastapi
```

## 2. Environment Variables
Add the following to your `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-key
VECTORDB_HOST=localhost
CHROMA_PORT=8001
```

## 3. Implementation Code
The implementation is located in `backend/app/services/chroma_engine.py`.

### Features:
- **OpenAI Embeddings**: Uses `text-embedding-3-small` for efficient, high-quality vectors.
- **User Isolation**: Every operation requires a `user_id`, which is enforced via ChromaDB metadata filtering.
- **Similarity Scoring**: Automatically converts distance metrics into a human-readable similarity score (0.0 to 1.0).
- **CRUD Support**: Full support for adding, searching, updating, and deleting memories.

## 4. API Usage Example (FastAPI)

```python
from fastapi import APIRouter, Depends
from app.services.chroma_engine import ChromaMemoryManager
from app.api.deps import get_current_user

router = APIRouter()
memory_manager = ChromaMemoryManager()

@router.post("/memories")
async def create_memory(content: str, current_user = Depends(get_current_user)):
    memory_id = memory_manager.add_memory(
        user_id=str(current_user.id),
        content=content,
        metadata={"source": "user_chat"}
    )
    return {"id": memory_id}

@router.get("/memories/search")
async def search_memories(query: str, current_user = Depends(get_current_user)):
    results = memory_manager.search_memories(
        user_id=str(current_user.id),
        query=query
    )
    return {"results": results}
```

## 5. Error Handling
The `ChromaMemoryManager` includes internal try-except blocks that:
- Log failures to the system logs (`logs/cognitive_os.log`).
- Raise descriptive `RuntimeError` or `Exception` for critical failures (e.g., missing API keys or database down).
- Gracefully handle empty results or search failures by returning empty lists instead of crashing.

---
*Note: Ensure ChromaDB is running before starting the application.*
```bash
chroma run --path ./chroma_data --port 8001
```
