import pytest
# Patch bcrypt to prevent passlib from raising a ValueError on newer bcrypt versions with long passwords (detection bug)
try:
    import bcrypt
    original_hashpw = bcrypt.hashpw
    def patched_hashpw(password, salt):
        if len(password) > 72:
            password = password[:72]
        return original_hashpw(password, salt)
    bcrypt.hashpw = patched_hashpw
except ImportError:
    pass

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.main import app as fastapi_app
from app.core.database import Base
from app.api.deps import get_db
from app.core.config import settings
settings.ENVIRONMENT = "testing"

# Compiler overrides to make PostgreSQL specific types compile to SQLite compatible types during local test execution
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "TEXT"


# Use isolated SQLite in-memory database for local test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Globally override SessionLocal in key modules during testing to use the SQLite memory DB
import app.core.database
import app.engine.automation.executor
import app.engine.agents.supervisor
import app.services.knowledge_capture
import app.scheduler.worker

app.core.database.SessionLocal = TestingSessionLocal
app.engine.automation.executor.SessionLocal = TestingSessionLocal
app.engine.agents.supervisor.SessionLocal = TestingSessionLocal
app.services.knowledge_capture.SessionLocal = TestingSessionLocal
app.scheduler.worker.SessionLocal = TestingSessionLocal

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def mock_user(db_session):
    import uuid
    from app.models.domain import User
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        hashed_password="hashed_password",
        role="user",
        name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    yield user


@pytest.fixture(autouse=True)
def mock_ollama_service():
    from unittest.mock import patch
    from app.llm.ollama import OllamaProvider
    
    async def mock_generate(self, prompt: str, system: str = "", temperature: float = 0.7, max_tokens: int = 4096):
        import json as _json
        # If intent classification / Intelligence Router
        if system and "intelligence router" in system.lower():
            return _json.dumps({
                "intent_id": "analytics_query",
                "workflow": "productivity_analytics",
                "confidence": 0.95,
                "requires_memory": False,
                "reasoning": "Productivity analysis routed to analytics specialism.",
                "priority": 3
            })
            
        # If Decision Engine
        if system and "decision engine" in system.lower():
            target = "execution-agent"
            if any(w in prompt.lower() for w in ["code", "python", "script", "count"]):
                target = "coder-agent"
            return _json.dumps({
                "selected_action": {
                    "action_id": "urgent_action",
                    "description": "Fix server error",
                    "agent_target": target,
                    "priority": { "impact": 10, "urgency": 10, "confidence": 0.9 },
                    "reasoning": "Critical error requires immediate fix",
                    "predicted_next_actions": []
                },
                "context_confidence": 0.9,
                "reasoning_chain": ["thought 1"]
            })
            
        # If Fact-Verifier / Hallucination Guardrail
        if system and "fact-verifier" in system.lower():
            is_grounded = True
            confidence = 0.95
            overall_confidence = 0.95
            claim_text = "Alex is a Python developer who likes dark mode"
            if "May 28" in prompt or "May 28, 2026" in prompt:
                is_grounded = False
                confidence = 0.3
                overall_confidence = 0.3
                claim_text = "The project will launch on May 28, 2026"
            return _json.dumps({
                "claims": [
                    {
                        "claim": claim_text,
                        "source_id": "1",
                        "is_grounded": is_grounded,
                        "confidence": confidence
                    }
                ],
                "overall_confidence": overall_confidence
            })

        # If Coder Agent
        if system and ("coder agent" in system.lower() or "software engineer" in system.lower()):
            return (
                "### Coder Agent Output:\n"
                "Here is the implementation to count to 10:\n"
                "```python\n"
                "def solve_task():\n"
                "    for i in range(1, 11):\n"
                "        print(i)\n"
                "```\n"
                "This solves the task by printing numbers 1 to 10."
            )

        # If intent classification system prompt is used:
        if system and "intent classifier" in system.lower():
            if any(w in prompt.lower() for w in ["code", "python", "script", "count"]):
                return "code"
            return "research"
            
        # If synthesis
        if system and ("synthesis" in system.lower() or "supervisor" in system.lower()):
            return f"[Mocked Supervisor Synthesis]\nTask resolved by sub-agent.\nResult:\n{prompt}"
            
        return f"[Mocked LLM Response for prompt: {prompt[:30]}]"

    async def mock_list_models(self):
        return ["llama3.2:latest", "nomic-embed-text:latest"]

    with patch.object(OllamaProvider, "generate", mock_generate), \
         patch.object(OllamaProvider, "list_models", mock_list_models):
        yield

