import chromadb
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# --- Relational Database (PostgreSQL) ---
try:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
except Exception as e:
    logger.error(f"Failed to connect to PostgreSQL: {e}")
    raise e

# --- Vector Database (ChromaDB) ---
try:
    chroma_client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    logger.info("Successfully connected to ChromaDB")
except Exception as e:
    logger.error(f"Failed to connect to ChromaDB: {e}")
    chroma_client = None

def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
