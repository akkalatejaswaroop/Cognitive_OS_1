from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.memory import MemoryService
from app.api.deps import get_current_user

router = APIRouter()
memory_service = MemoryService()

class MemoryStoreRequest(BaseModel):
    content: str
    metadata: dict = None

class MemoryQueryRequest(BaseModel):
    query: str
    n_results: int = 3

@router.post("/store")
def store_memory(req: MemoryStoreRequest, current_user = Depends(get_current_user)):
    doc_id = memory_service.store_memory(req.content, req.metadata)
    return {"success": True, "doc_id": doc_id}

@router.post("/query")
def query_memory(req: MemoryQueryRequest, current_user = Depends(get_current_user)):
    results = memory_service.retrieve_memory(req.query, req.n_results)
    return {"success": True, "data": results}
