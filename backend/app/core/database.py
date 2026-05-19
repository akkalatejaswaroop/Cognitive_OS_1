from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------- #
#  Relational Database — PostgreSQL via Neon                              #
# ----------------------------------------------------------------------- #
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.info("PostgreSQL engine created successfully.")
except Exception as e:
    logger.error(f"Failed to connect to PostgreSQL: {e}")
    raise e


# ----------------------------------------------------------------------- #
#  Vector Database — ChromaDB (optional; gracefully disabled when down)  #
# ----------------------------------------------------------------------- #
chroma_client = None

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings

    chroma_client = chromadb.HttpClient(
        host=settings.VECTORDB_HOST,
        port=settings.CHROMA_PORT,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    # Lightweight connectivity probe
    chroma_client.heartbeat()
    logger.info("Successfully connected to ChromaDB.")
except Exception as e:
    logger.warning(
        f"ChromaDB not available ({e}). Memory/vector features will be disabled. "
        "Start ChromaDB or run: `chroma run --path ./chroma_data`"
    )
    chroma_client = None


# ----------------------------------------------------------------------- #
#  DB session dependency (FastAPI)                                        #
# ----------------------------------------------------------------------- #
def get_db():
    """Yield a SQLAlchemy session, always closing afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
