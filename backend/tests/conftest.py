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

from app.main import app
from app.core.database import Base
from app.api.deps import get_db

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
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_ollama_service():
    from unittest.mock import patch
    from app.services.llm import OllamaService
    
    async def mock_generate_response(self, prompt: str, model: str = "", system_prompt: str = ""):
        # If intent classification system prompt is used:
        if system_prompt and "intent classifier" in system_prompt.lower():
            if any(w in prompt.lower() for w in ["code", "python", "script", "count"]):
                return "code"
            return "research"
        # If synthesis
        if system_prompt and ("synthesis" in system_prompt.lower() or "supervisor" in system_prompt.lower()):
            return f"[Mocked Supervisor Synthesis]\nTask resolved by sub-agent.\nResult:\n{prompt}"
        return f"[Mocked LLM Response for prompt: {prompt[:30]}]"

    async def mock_list_models(self):
        return ["llama3.2:latest", "nomic-embed-text:latest"]

    with patch.object(OllamaService, "generate_response", mock_generate_response), \
         patch.object(OllamaService, "list_models", mock_list_models):
        yield

