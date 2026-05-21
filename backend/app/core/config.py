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
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Firebase Admin SDK credentials (path to JSON file or JSON string)
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    # Postgres Database (Neon)
    DATABASE_URL: str = "postgresql://neondb_owner:npg_o4ARTSGqsm0W@ep-mute-mountain-ak7nhohq-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require"

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

    # CORS Allowed Origins (comma-separated list for production, e.g., https://my-app.vercel.app)
    ALLOWED_ORIGINS: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()


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


import logging.handlers  # noqa: E402 — needed for the handler above

setup_logging()
