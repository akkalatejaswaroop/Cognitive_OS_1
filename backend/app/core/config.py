import os
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging
from logging.handlers import RotatingFileHandler

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognitive OS"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Postgres Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/cognitive_os"
    
    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    
    # LLM & APIs
    OPENROUTER_API_KEY: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

# Logging System Setup
def setup_logging():
    log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    # Make logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # File handler
    file_handler = RotatingFileHandler("logs/cognitive_os.log", maxBytes=10*1024*1024, backupCount=5)
    file_handler.setFormatter(log_formatter)
    root_logger.addHandler(file_handler)

setup_logging()
