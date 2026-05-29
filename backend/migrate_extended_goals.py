"""
Migration script to extend the live Neon PostgreSQL goals table DDL constraints safely.
"""
import os
import logging
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("goals_migration")

def migrate():
    # Load backend .env variables
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        logger.info("Loaded .env configuration successfully.")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL is missing!")
        return

    logger.info("Connecting to Neon database and performing ALTER TABLE operations...")
    try:
        engine = create_engine(database_url)
        with engine.begin() as conn:
            # 1. Add goal_type
            conn.execute(text(
                "ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) DEFAULT 'short_term' NOT NULL CHECK (goal_type IN ('short_term', 'long_term'));"
            ))
            # 2. Add parent_goal_id
            conn.execute(text(
                "ALTER TABLE goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;"
            ))
            # 3. Add projected_completion_date
            conn.execute(text(
                "ALTER TABLE goals ADD COLUMN IF NOT EXISTS projected_completion_date TIMESTAMP WITH TIME ZONE;"
            ))
        logger.info("Goals table DDL altered successfully with parent links and projections!")
    except Exception as exc:
        logger.error(f"Failed to execute ALTER TABLE migrations: {exc}")

if __name__ == "__main__":
    migrate()
