"""
Unit and integration tests for Cognitive OS Knowledge Capture System (KCS).
Verifies voice staging, Whisper transcription, AI summarization, database transactions,
and ChromaDB memory indexing.
"""
import os
import uuid
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.domain import Base, User, KnowledgeEntry, KnowledgeInsight
from app.services.knowledge_capture import KnowledgeCaptureService

# Setup in-memory SQLite database for fast unit testing isolated from active transactions
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
        # Prevent database session closing during test runs
        pass

@pytest.mark.asyncio
async def test_capture_text_stages_and_processes(db_session):
    """Verifies that quick note capture logs base parameters and triggers async processors."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    service = KnowledgeCaptureService(db_session)
    
    # Mock the internal LLM provider and memory indexing triggers
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="""```json
    {
      "summary": "The developer discussed refactoring conftest engine imports.",
      "key_points": ["Refactor conftest.py engine scopes"],
      "action_items": ["Sarah to fix namespace collisions"],
      "entities": {"people": ["Sarah"]},
      "sentiment": "Collaborative"
    }
    ```""")
    
    mock_memory = AsyncMock()
    mock_memory.create_memory = AsyncMock(return_value="mem_123")
    
    service._llm = mock_llm
    service._memory = mock_memory
    
    # 1. Initiate Note Capture Ingestion
    entry = await service.capture_text(
        user_id=user_id,
        text="Let's refactor conftest engine imports to prevent SQL locking issues.",
        title="Sprint Align"
    )
    
    assert entry.id is not None
    assert entry.status == "processing"
    assert entry.source_type == "text"
    assert entry.title == "Sprint Align"
    
    # 2. Run background processor synchronously to test its logic
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False):
        await service.process_entry(entry.id)
        
    # Refresh to see background thread updates in in-memory DB
    db_session.refresh(entry)
    
    assert entry.status == "completed"
    assert entry.raw_content == "Let's refactor conftest engine imports to prevent SQL locking issues."
    
    # Verify AI Insight was generated and stored in SQL
    insight = db_session.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == entry.id).first()
    assert insight is not None
    assert insight.summary == "The developer discussed refactoring conftest engine imports."
    assert insight.sentiment == "Collaborative"
    assert "Sarah to fix namespace collisions" in insight.action_items

@pytest.mark.asyncio
async def test_capture_voice_whisper_and_indexing(db_session):
    """Verifies voice staging, Whisper transcription, and Chroma memory indexing."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    service = KnowledgeCaptureService(db_session)
    
    # Set up mocks for OpenAI transcription and embeddings APIs
    mock_openai = AsyncMock()
    
    mock_transcript = MagicMock()
    mock_transcript.text = "We need a Redis rate-limiter middleware on all tenant endpoints."
    mock_openai.audio.transcriptions.create = AsyncMock(return_value=mock_transcript)
    
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="""```json
    {
      "summary": "Deploy a Redis rate limiter to prevent Distributed Scraping.",
      "key_points": ["Deploy Redis rate limiter"],
      "action_items": ["Alex to implement rate limiting middleware"],
      "entities": {"people": ["Alex"]},
      "sentiment": "Urgent"
    }
    ```""")
    
    mock_memory = AsyncMock()
    mock_memory.create_memory = AsyncMock(return_value="vector_id_123")
    
    service._openai_client = mock_openai
    service._llm = mock_llm
    service._memory = mock_memory
    
    # Mock active Wave file upload
    mock_file = AsyncMock()
    mock_file.filename = "memo.wav"
    mock_file.content_type = "audio/wav"
    mock_file.read = AsyncMock(return_value=b"RAW_AUDIO_WAVE_BYTES")
    
    # 1. Trigger Voice Ingestion (Staging phase)
    with patch("os.makedirs"), patch("builtins.open", create=True) as mock_open:
        entry = await service.capture_voice(user_id=user_id, audio_file=mock_file)
        
    assert entry.id is not None
    assert entry.status == "processing"
    assert entry.source_type == "voice"
    assert entry.content_url.startswith("/static/voice/")
    
    # 2. Run background processor with mocked file systems
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False), \
         patch("os.path.exists", return_value=True), \
         patch("builtins.open", create=True) as mock_open:
        await service.process_entry(entry.id, local_path="static/voice/test_audio.wav")
        
    db_session.refresh(entry)
    
    assert entry.status == "completed"
    assert entry.raw_content == "We need a Redis rate-limiter middleware on all tenant endpoints."
    
    # Verify OpenAI client was called
    mock_openai.audio.transcriptions.create.assert_called_once()
    
    # Verify vector memory was indexed
    mock_memory.create_memory.assert_called_once_with(
        user_id=user_id,
        content="We need a Redis rate-limiter middleware on all tenant endpoints.",
        memory_type="captured_voice",
        importance_score=0.7
    )

@pytest.mark.asyncio
async def test_multi_agent_event_integration(db_session):
    """Verifies that capture events trigger the EventBus, Supervisor, and Automation Agent pipeline."""
    user_id = uuid.UUID("a90d965e-21ef-401d-96e0-8ce69f88c3a9")
    
    # 1. Setup mock agents in the global registry
    from app.engine.agents.registry import AgentRegistry
    from app.engine.agents.supervisor import SupervisorAgent
    from app.engine.agents.summary_agent import SummaryAgent
    from app.engine.agents.memory_agent import MemoryAgent
    from app.engine.agents.execution_agent import ExecutionAgent
    from app.orchestration.bus import event_bus
    
    registry = AgentRegistry.get()
    
    mock_supervisor = SupervisorAgent()
    mock_summary_agent = MagicMock(spec=SummaryAgent)
    mock_summary_agent.name = "summary-agent"
    
    # Mock structured summary response with an email draft action item to trigger reactive automation
    from app.engine.agents.summary_agent import StructuredSummary, KeyInsight
    mock_structured = StructuredSummary(
        title="Redis Rate Limiter Design",
        executive_summary="Sarah Jenkins and the team will implement Redis rate-limiting middleware.",
        bullet_points=["Implement rate-limiting middleware"],
        key_insights=[KeyInsight(title="Tenant Protection", description="Critical for SaaS security.")],
        action_items=["Email Sarah Jenkins about rate limiting PR tomorrow"]
    )
    mock_summary_agent.generate_summary = AsyncMock(return_value=mock_structured)
    
    mock_memory_agent = MagicMock(spec=MemoryAgent)
    mock_memory_agent.name = "memory-agent"
    mock_memory_agent.save_memory = AsyncMock(return_value="vector_uuid_999")
    
    mock_execution_agent = MagicMock(spec=ExecutionAgent)
    mock_execution_agent.name = "execution-agent"
    mock_execution_agent.execute = AsyncMock(return_value="Email draft queued successfully.")
    
    registry.register(mock_supervisor)
    registry.register(mock_summary_agent)
    registry.register(mock_memory_agent)
    registry.register(mock_execution_agent)
    
    service = KnowledgeCaptureService(db_session)
    
    # 2. Stage a text note capturing action items
    entry = KnowledgeEntry(
        user_id=user_id,
        source_type="text",
        title="Note: Sprint Sync notes",
        raw_content="Implement Redis rate limiting. Email Sarah Jenkins about rate limiting PR tomorrow.",
        status="processing"
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)
    
    # 3. Simulate processing entry under patched SQLite SessionLocals
    mock_session_local = MagicMock(return_value=MockSessionContext(db_session))
    
    # We patch the event loop is_running to False so KCS executes the supervisor pipeline synchronously in the test
    with patch("app.services.knowledge_capture.SessionLocal", mock_session_local), \
         patch("app.engine.agents.supervisor.SessionLocal", mock_session_local), \
         patch("app.orchestration.bus.event_bus.is_running", False):
        await service.process_entry(entry.id)
        
    db_session.refresh(entry)
    
    # Assert relational status transitions are correctly sequenced
    assert entry.status == "completed"
    assert entry.title == "Redis Rate Limiter Design"
    
    # Assert KnowledgeInsight PostgreSQL relational record was committed
    insight = db_session.query(KnowledgeInsight).filter(KnowledgeInsight.entry_id == entry.id).first()
    assert insight is not None
    assert insight.summary == "Sarah Jenkins and the team will implement Redis rate-limiting middleware."
    assert "Email Sarah Jenkins about rate limiting PR tomorrow" in insight.action_items
    
    # Assert MemoryAgent is called for Chroma persistence
    mock_memory_agent.save_memory.assert_called_once()
    
    # Assert ExecutionAgent is triggered for action items
    mock_execution_agent.execute.assert_called_once()
    # It should be called to draft an email automatically!
    args, kwargs = mock_execution_agent.execute.call_args
    assert "email_drafting" in args[0]
    assert "Email Sarah Jenkins about rate limiting PR tomorrow" in args[0]

