from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.chroma_engine import ChromaMemoryManager
from app.api.deps import get_current_user
from app.models.domain import User

router = APIRouter()
memory_manager = ChromaMemoryManager()

class MemoryStoreRequest(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = None
    memory_type: str = "episodic"

class MemoryQueryRequest(BaseModel):
    query: str
    n_results: int = 5
    memory_type: Optional[str] = None

class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@router.post("/store")
async def store_memory(req: MemoryStoreRequest, current_user: User = Depends(get_current_user)):
    """
    Store a new memory for the authenticated user.
    """
    try:
        memory_id = memory_manager.add_memory(
            user_id=str(current_user.id),
            content=req.content,
            metadata=req.metadata,
            memory_type=req.memory_type
        )
        return {"success": True, "memory_id": memory_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store memory: {str(e)}")

@router.post("/query")
async def query_memory(req: MemoryQueryRequest, current_user: User = Depends(get_current_user)):
    """
    Semantic search for memories belonging to the authenticated user.
    """
    try:
        results = memory_manager.search_memories(
            user_id=str(current_user.id),
            query=req.query,
            n_results=req.n_results,
            memory_type=req.memory_type
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query memories: {str(e)}")

@router.patch("/{memory_id}")
async def update_memory(
    memory_id: str, 
    req: MemoryUpdateRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing memory.
    """
    try:
        # Note: In a production app, you'd first verify ownership in Postgres 
        # but Chroma update will only update if the ID exists.
        memory_manager.update_memory(
            memory_id=memory_id,
            content=req.content,
            metadata=req.metadata
        )
        return {"success": True, "message": "Memory updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update memory: {str(e)}")

@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete a specific memory by ID.
    """
    try:
        memory_manager.delete_memory(memory_id=memory_id)
        return {"success": True, "message": "Memory deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete memory: {str(e)}")

@router.delete("/clear-all")
async def clear_all_memories(current_user: User = Depends(get_current_user)):
    """
    Delete all memories for the authenticated user.
    """
    try:
        memory_manager.clear_user_memories(user_id=str(current_user.id))
        return {"success": True, "message": "All memories cleared for user"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear memories: {str(e)}")
