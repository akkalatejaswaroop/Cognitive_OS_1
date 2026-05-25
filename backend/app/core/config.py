import os
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging
from logging.handlers import RotatingFileHandler


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognitive OS"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Firebase Admin SDK credentials (path to JSON file or JSON string)
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    FIREBASE_PROJECT_ID: str = ""

    # Postgres Database (Neon) — MUST be set via .env or environment variable
    DATABASE_URL: str = ""

    # ChromaDB (vector store)
    VECTORDB_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    # ------------------------------------------------------------------ #
    #  Ollama  (local inference — replaces OpenRouter)                    #
    # ------------------------------------------------------------------ #
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str = "llama3.2:latest"
    # Model used for embeddings via nomic-embed-text
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text:latest"

    # Legacy key — kept so old .env files don't break pydantic-settings
    OPENROUTER_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # ── OpenAI ──────────────────────────────────────────────────────────── #
    OPENAI_API_KEY: str = ""
    OPENAI_DEFAULT_MODEL: str = "gpt-4o"

    # ── IBM Granite (Watsonx.ai) ─────────────────────────────────────────── #
    IBM_GRANITE_API_KEY: str = ""
    IBM_GRANITE_PROJECT_ID: str = ""
    IBM_GRANITE_ENDPOINT: str = "https://us-south.ml.cloud.ibm.com"
    IBM_GRANITE_MODEL: str = "ibm/granite-3-3-8b-instruct"

    # ── Agent orchestration ──────────────────────────────────────────────── #
    AGENT_RETRY_MAX: int = 3
    AGENT_TIMEOUT_SECONDS: int = 120
    MAX_DELEGATION_DEPTH: int = 5
    CIRCUIT_BREAKER_THRESHOLD: int = 3
    CIRCUIT_BREAKER_RESET_SECONDS: int = 30

    # ── Tools ────────────────────────────────────────────────────────────── #
    TAVILY_API_KEY: str = ""
    CODE_RUNNER_TIMEOUT_SECONDS: int = 10

    # CORS Allowed Origins (comma-separated list for production, e.g., https://my-app.vercel.app)
    ALLOWED_ORIGINS: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()

# Validate required settings at import time
if not settings.DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Create a backend/.env file from backend/.env.example "
        "or set the DATABASE_URL environment variable."
    )
if not settings.SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set. Generate a strong random key and add it to your .env file."
    )

# --------------------------------------------------------------------------- #
#  Logging                                                                    #
# --------------------------------------------------------------------------- #
def setup_logging():
    log_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    os.makedirs("logs", exist_ok=True)
    file_handler = logging.handlers.RotatingFileHandler(
        "logs/cognitive_os.log", maxBytes=10 * 1024 * 1024, backupCount=5
    )
    file_handler.setFormatter(log_formatter)
    root_logger.addHandler(file_handler)


setup_logging()


def validate_settings():
    if not settings.DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in .env file or "
            "as an environment variable."
        )
    if not settings.SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY is not configured. Set it in .env file or "
            "as an environment variable."
        )


validate_settings()
