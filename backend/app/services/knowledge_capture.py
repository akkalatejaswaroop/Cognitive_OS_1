"""
Knowledge Capture Service — Cognitive OS.
Orchestrates the ingestion, transcription, summarization, and embedding of multi-modal data.
"""
from __future__ import annotations

import logging
import uuid
import json
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.models.domain import KnowledgeEntry, KnowledgeInsight, User
from app.llm.factory import get_llm_provider
from app.services.memory import MemoryService
from app.core.database import SessionLocal

logger = logging.getLogger("knowledge_capture")

SUMMARIZATION_PROMPT = """
You are the Cognitive OS Knowledge Specialist. Analyze the provided raw content 
(which may be a transcript, a note, or a document) and extract structured insights.

### RAW CONTENT:
{{raw_content}}

### INSTRUCTIONS:
1. **Summary:** Provide a concise 2-3 sentence overview.
2. **Key Points:** List the top 5 most important facts or decisions.
3. **Action Items:** Extract any commitments or tasks mentioned.
4. **Entities:** Identify key people, organizations, or projects.
5. **Sentiment:** Determine the overall tone (e.g., Collaborative, Urgent, Informational).

### OUTPUT FORMAT (JSON):
{
  "summary": "String",
  "key_points": ["String"],
  "action_items": ["String"],
  "entities": {"people": [], "orgs": [], "projects": []},
  "sentiment": "String"
}
"""

class KnowledgeCaptureService:
    def __init__(self, db: Session):
        self.db = db
        self._llm = get_llm_provider()
        self._memory = MemoryService(db)

    async def capture_text(self, user_id: uuid.UUID, text: str, title: Optional[str] = None) -> KnowledgeEntry:
        """Processes a simple text note."""
        entry = KnowledgeEntry(
            user_id=user_id,
            source_type="text",
            title=title or f"Note: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            raw_content=text,
            status="processing"
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        # Trigger async processing (Simulated here)
        asyncio.create_task(self.process_entry(entry.id))
        return entry

    async def capture_voice(self, user_id: uuid.UUID, audio_file: UploadFile) -> KnowledgeEntry:
        """Processes an audio recording."""
        # 1. Save file to storage (Mocked)
        file_url = f"storage://voice/{uuid.uuid4()}.wav"
        
        entry = KnowledgeEntry(
            user_id=user_id,
            source_type="voice",
            title=f"Voice Memo: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            content_url=file_url,
            status="processing"
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        # Trigger async transcription + processing
        asyncio.create_task(self.process_entry(entry.id))
        return entry

    async def capture_file(self, user_id: uuid.UUID, file: UploadFile) -> KnowledgeEntry:
        """Processes a document upload (PDF/Docx)."""
        file_url = f"storage://docs/{uuid.uuid4()}_{file.filename}"
        
        entry = KnowledgeEntry(
            user_id=user_id,
            source_type="document",
            title=f"Document: {file.filename}",
            content_url=file_url,
            status="processing"
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        # Trigger async processing
        asyncio.create_task(self.process_entry(entry.id))
        return entry

    async def process_entry(self, entry_id: uuid.UUID):
        """
        The background pipeline: Transcription (if voice) -> Summarization -> Embedding.
        """
        # We need a fresh session for background tasks
        with SessionLocal() as db:
            entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
            if not entry: return

            try:
                # 1. Transcription (Mock for Whisper)
                if entry.source_type == "voice" and not entry.raw_content:
                    entry.processing_log = "Transcribing audio via Whisper..."
                    db.commit()
                    await asyncio.sleep(1) # Simulate I/O
                    entry.raw_content = "This is a simulated transcript from the Whisper API. The user discussed the Cognitive OS architecture and the need for a robust Knowledge Capture System."

                # 2. AI Summarization
                entry.processing_log = "Generating AI insights..."
                db.commit()
                
                prompt = SUMMARIZATION_PROMPT.replace("{{raw_content}}", entry.raw_content)
                response = await self._llm.generate(prompt=prompt, temperature=0.1)
                
                # Parse JSON
                try:
                    data = self._parse_json(response)
                    insight = KnowledgeInsight(
                        entry_id=entry.id,
                        summary=data.get("summary", ""),
                        key_points=data.get("key_points", []),
                        action_items=data.get("action_items", []),
                        entities=data.get("entities", {}),
                        sentiment=data.get("sentiment", "Neutral")
                    )
                    db.add(insight)
                except Exception as parse_err:
                    logger.error(f"Failed to parse AI response: {parse_err}")
                    entry.processing_log += f"\nError parsing AI output: {parse_err}"

                # 3. Vector Storage (Embedding)
                entry.processing_log = "Indexing in semantic memory..."
                db.commit()
                
                # Use existing MemoryService to embed and save to Chroma
                await self._memory.create_memory(
                    user_id=entry.user_id,
                    content=entry.raw_content,
                    memory_type=f"captured_{entry.source_type}",
                    importance_score=0.7 # High importance for manual captures
                )

                entry.status = "completed"
                entry.processing_log = "Knowledge captured and indexed successfully."
                db.commit()

            except Exception as e:
                logger.error(f"Knowledge processing failed: {e}")
                entry.status = "failed"
                entry.processing_log = str(e)
                db.commit()

    def _parse_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
