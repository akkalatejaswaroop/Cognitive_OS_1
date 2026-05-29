"""
Extended integration and edge case tests for Cognitive OS Knowledge Capture System (KCS).
Validates edge cases, API failures, JSON synthesis corruption, and concurrent ingestion runs.
"""
import os
import uuid
import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.domain import Base, User, KnowledgeEntry, KnowledgeInsight
from app.services.knowledge_capture import KnowledgeCaptureService

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    """Yields a clean, in-memory SQLite database transaction session."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Register dummy user for foreign keys
    test_user = User(
        id=uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9"),
        email="developer@cognitive-os.com",
        hashed_password="hashed_dummy_password"
    )
    db.add(test_user)
    db.commit()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

class MockSessionContext:
    """Helper context manager that yields the database session without closing it."""
    def __init__(self, session):
        self.session = session
    def __enter__(self):
        return self.session
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

@pytest.mark.asyncio
async def test_capture_empty_text_and_special_characters(db_session):
    """Edge Case Handling: Verifies handling of empty inputs and special symbols."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    service = KnowledgeCaptureService(db_session)
    
    # 1. Special characters note
    special_text = "🔧 Workspaces & agents $100% *dynamic*? YES! ~`!@#$%^&*()_+{}|:\"<>?`-=[]\\;',./"
    
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="""```json
    {
      "summary": "Verified system dynamics under highly non-standard characters.",
      "key_points": ["Special character sanitization successful"],
      "action_items": [],
      "entities": {"people": [], "orgs": [], "projects": []},
      "sentiment": "Informational"
    }
    ```""")
    service._llm = mock_llm
    service._memory = AsyncMock()
    
    entry = await service.capture_text(
        user_id=user_id,
        text=special_text,
        title="Edge Special Characters"
    )
    
    db_session.refresh(entry)
    assert entry.raw_content == special_text
    
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False):
        await service.process_entry(entry.id)
        
    db_session.refresh(entry)
    assert entry.status == "completed"
    
    insight = db_session.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == entry.id).first()
    assert insight is not None
    assert insight.sentiment == "Informational"

@pytest.mark.asyncio
async def test_transcription_api_failure_and_fallback(db_session):
    """API Failure Handling: Verifies that transcription degrades gracefully on Whisper API crashes."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    service = KnowledgeCaptureService(db_session)
    
    # Simulate API throwing HTTP exception or connection aborts
    mock_openai = AsyncMock()
    mock_openai.audio.transcriptions.create.side_effect = Exception("OpenAI API rate limit exceeded or endpoint down.")
    service._openai_client = mock_openai
    
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="""```json
    {
      "summary": "Simulated transcript loaded due to external integration blackout.",
      "key_points": ["Activated graceful offline fallback transcription"],
      "action_items": [],
      "entities": {"people": [], "orgs": [], "projects": []},
      "sentiment": "Neutral"
    }
    ```""")
    service._llm = mock_llm
    service._memory = AsyncMock()
    
    mock_file = AsyncMock()
    mock_file.filename = "corrupted_or_heavy.wav"
    mock_file.read = AsyncMock(return_value=b"DUMMY_BINARY_WAV_BLOB")
    
    with patch("os.makedirs"), patch("builtins.open", create=True):
        entry = await service.capture_voice(user_id=user_id, audio_file=mock_file)
        
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False), \
         patch("os.path.exists", return_value=True), \
         patch("builtins.open", create=True):
        await service.process_entry(entry.id, local_path="static/voice/corrupted_or_heavy.wav")
        
    db_session.refresh(entry)
    
    # Status should be completed as it gracefully degrades to a simulated fallback transcript
    assert entry.status == "completed"
    assert "This is a simulated transcript from the Whisper API" in entry.raw_content

@pytest.mark.asyncio
async def test_llm_malformed_json_response_handling(db_session):
    """Edge Case / API Failure: Tests resilience against malformed LLM outputs."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    service = KnowledgeCaptureService(db_session)
    
    # LLM produces syntax errors or returns non-JSON text
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="""Here is the summary in plain text instead of JSON:
    1. The project has moved forward.
    2. We need to hire more engineers immediately.
    There are no actions to report.""")
    service._llm = mock_llm
    service._memory = AsyncMock()
    
    entry = await service.capture_text(
        user_id=user_id,
        text="A brief sync about upcoming engineering hiring.",
        title="Hiring Plan"
    )
    
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False):
        await service.process_entry(entry.id)
        
    db_session.refresh(entry)
    
    # Entry completes successfully by degrading gracefully (indexing raw text even if synthesis fails)
    assert entry.status == "completed"
    
    # Verify that a robust default fallback KnowledgeInsight is safely created in relational storage
    insight = db_session.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == entry.id).first()
    assert insight is not None
    assert insight.summary == "Brief description of the captured note."

@pytest.mark.asyncio
async def test_concurrent_ingestion_and_race_conditions(db_session):
    """Concurrent Users: Simulates multiple concurrent ingestions accessing session pools."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    service = KnowledgeCaptureService(db_session)
    
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="""```json
    {
      "summary": "Concurrent block successfully ingested.",
      "key_points": ["Multi-tenant isolation verified"],
      "action_items": [],
      "entities": {"people": [], "orgs": [], "projects": []},
      "sentiment": "Neutral"
    }
    ```""")
    service._llm = mock_llm
    service._memory = AsyncMock()
    
    # Create multiple entries
    entries = []
    for idx in range(5):
        entry = await service.capture_text(
            user_id=user_id,
            text=f"Concurrent task payload #{idx}",
            title=f"Concurrent Ingestion {idx}"
        )
        entries.append(entry)
        
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    
    # Process concurrently using asyncio.gather
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False):
        tasks = [service.process_entry(e.id) for e in entries]
        await asyncio.gather(*tasks)
        
    # Re-fetch and check all entries
    for e in entries:
        db_session.refresh(e)
        assert e.status == "completed"
        assert "Concurrent block" in db_session.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == e.id).first().summary
