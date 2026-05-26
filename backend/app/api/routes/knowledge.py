"""
Knowledge Capture API — Cognitive OS.
Endpoints for multi-modal ingestion (Voice, Text, Documents).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional, Dict, Any

from app.api.deps import get_current_user, get_db
from app.models.domain import User, KnowledgeEntry, KnowledgeInsight
from app.services.knowledge_capture import KnowledgeCaptureService

router = APIRouter(prefix="/knowledge", tags=["Knowledge Capture"])

@router.post("/text", status_code=status.HTTP_202_ACCEPTED)
async def capture_text(
    text: str = Form(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Captures a text-based note or snippet."""
    service = KnowledgeCaptureService(db)
    entry = await service.capture_text(current_user.id, text, title)
    return {"entry_id": entry.id, "status": entry.status, "message": "Text capture initiated."}

@router.post("/voice", status_code=status.HTTP_202_ACCEPTED)
async def capture_voice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Captures and transcribes a voice memo."""
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an audio file.")
        
    service = KnowledgeCaptureService(db)
    entry = await service.capture_voice(current_user.id, file)
    return {"entry_id": entry.id, "status": entry.status, "message": "Voice capture initiated. Transcription starting."}

@router.post("/file", status_code=status.HTTP_202_ACCEPTED)
async def capture_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Captures and parses a document (PDF/Docx)."""
    # In a real app, validate against a whitelist of extensions
    service = KnowledgeCaptureService(db)
    entry = await service.capture_file(current_user.id, file)
    return {"entry_id": entry.id, "status": entry.status, "message": "File upload initiated. AI analysis starting."}

@router.get("/{entry_id}", response_model=Dict[str, Any])
async def get_capture_status(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the status and processed insights for a capture entry."""
    entry = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.id == entry_id,
        KnowledgeEntry.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found.")
        
    insight = db.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == entry.id).first()
    
    return {
        "id": entry.id,
        "title": entry.title,
        "source": entry.source_type,
        "status": entry.status,
        "raw_content": entry.raw_content,
        "log": entry.processing_log,
        "created_at": entry.created_at,
        "insight": {
            "summary": insight.summary,
            "key_points": insight.key_points,
            "action_items": insight.action_items,
            "entities": insight.entities,
            "sentiment": insight.sentiment
        } if insight else None
    }

@router.get("/list/all", response_model=List[Dict[str, Any]])
async def list_recent_captures(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists recent knowledge captures for the user."""
    entries = db.query(KnowledgeEntry).filter(
        KnowledgeEntry.user_id == current_user.id
    ).order_by(KnowledgeEntry.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": e.id,
            "title": e.title,
            "source": e.source_type,
            "status": e.status,
            "created_at": e.created_at
        } for e in entries
    ]
