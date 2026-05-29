"""
Live Neon PostgreSQL Migration & Seeding Runner — Cognitive OS.
Connects directly to the cloud database and executes production DDL table setups,
optimized index constraints, and initial telemetry seed records.
"""
import os
import sys
import logging
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Setup structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("neon_migration")

def run_migration():
    # 1. Load environment variables
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        logger.info("Loaded environment variables from local backend .env file.")
    else:
        logger.warning("No local .env file found. Falling back to system environment variables.")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL is not set in environment or .env file.")
        sys.exit(1)

    # Clean URL parameters if pooler issues arise
    if "sslmode" not in database_url:
        if "?" in database_url:
            database_url += "&sslmode=require"
        else:
            database_url += "?sslmode=require"

    logger.info("Connecting to Neon PostgreSQL Cloud Database...")
    try:
        # Create SQLAlchemy engine
        engine = create_engine(database_url, echo=False)
        
        # SQL DDL Statements for Productivity Analytics Tables
        ddl_statements = [
            # Check users exists (should always be true in active workspaces)
            """
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user' NOT NULL,
                is_active BOOLEAN DEFAULT TRUE NOT NULL,
                name VARCHAR(255),
                timezone VARCHAR(100) DEFAULT 'UTC' NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """,
            # Goals Table
            """
            CREATE TABLE IF NOT EXISTS goals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                target_date TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed', 'delayed', 'abandoned')),
                completion_percentage DOUBLE PRECISION DEFAULT 0.0 NOT NULL CHECK (completion_percentage >= 0.0 AND completion_percentage <= 100.0),
                key_results JSONB DEFAULT '{}'::jsonb NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """,
            # Task History Table
            """
            CREATE TABLE IF NOT EXISTS task_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
                estimated_duration_minutes INTEGER,
                actual_duration_minutes INTEGER,
                completed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """,
            # Focus Sessions Table
            """
            CREATE TABLE IF NOT EXISTS focus_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                ended_at TIMESTAMP WITH TIME ZONE,
                duration_seconds INTEGER DEFAULT 0 NOT NULL,
                interruption_count INTEGER DEFAULT 0 NOT NULL CHECK (interruption_count >= 0),
                context_switch_count INTEGER DEFAULT 0 NOT NULL CHECK (context_switch_count >= 0),
                flow_state_score DOUBLE PRECISION DEFAULT 1.0 NOT NULL CHECK (flow_state_score >= 0.0 AND flow_state_score <= 1.0),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """,
            # Productivity Logs Table
            """
            CREATE TABLE IF NOT EXISTS productivity_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                focus_session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                active_application VARCHAR(255) NOT NULL,
                window_title VARCHAR(500),
                keystroke_count INTEGER DEFAULT 0 NOT NULL CHECK (keystroke_count >= 0),
                keystroke_average_gap_ms DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
                mouse_scroll_pixels INTEGER DEFAULT 0 NOT NULL,
                app_switch_count INTEGER DEFAULT 0 NOT NULL CHECK (app_switch_count >= 0),
                is_distracting BOOLEAN DEFAULT FALSE NOT NULL,
                fatigue_index DOUBLE PRECISION DEFAULT 0.0 NOT NULL CHECK (fatigue_index >= 0.0 AND fatigue_index <= 1.0)
            );
            """,
            # AI Recommendations Table
            """
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL CHECK (category IN ('focus', 'pacing', 'delegation', 'goal_restructure')),
                description TEXT NOT NULL,
                priority_score DOUBLE PRECISION DEFAULT 0.5 NOT NULL CHECK (priority_score >= 0.0 AND priority_score <= 1.0),
                is_actionable BOOLEAN DEFAULT TRUE NOT NULL,
                action_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
                status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'dismissed', 'executed')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """,
            # Analytics Reports Table
            """
            CREATE TABLE IF NOT EXISTS analytics_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('daily', 'weekly')),
                start_date TIMESTAMP WITH TIME ZONE NOT NULL,
                end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                markdown_content TEXT NOT NULL,
                metrics_summary JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """,
            # Activity Logs Table
            """
            CREATE TABLE IF NOT EXISTS activity_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                ip_address VARCHAR(100),
                user_agent VARCHAR(500),
                action_type VARCHAR(100) NOT NULL,
                severity_level VARCHAR(50) DEFAULT 'info' NOT NULL CHECK (severity_level IN ('info', 'warning', 'error', 'critical')),
                metadata_json JSONB DEFAULT '{}'::jsonb NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            """
        ]

        # SQL Index Statements
        index_statements = [
            "CREATE INDEX IF NOT EXISTS idx_prod_logs_user_timestamp ON productivity_logs (user_id, timestamp DESC);",
            "CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON focus_sessions (user_id, started_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_goals_key_results ON goals USING gin (key_results);",
            "CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals (user_id, status) WHERE status = 'active';",
            "CREATE INDEX IF NOT EXISTS idx_ai_recs_user_pending ON ai_recommendations (user_id, status) WHERE status = 'pending';",
            "CREATE INDEX IF NOT EXISTS idx_activity_logs_severity_timestamp ON activity_logs (severity_level, created_at DESC);"
        ]

        with engine.begin() as conn:
            # 2. Run DDL Schemas
            logger.info("Executing DDL Table Creations...")
            for query in ddl_statements:
                conn.execute(text(query))
            logger.info("DDL Table Creations completed successfully.")

            # 3. Create Optimized Indexes
            logger.info("Configuring High-Performance Indexes...")
            for query in index_statements:
                conn.execute(text(query))
            logger.info("Index Optimization completed successfully.")

            # 4. Ingest Example Seed Records for Developer Workspace
            logger.info("Checking for target seed developer account...")
            user_check = conn.execute(
                text("SELECT id FROM users WHERE email = 'analytics_dev@cognitive-os.com'")
            ).fetchone()
            
            # Auto-provision developer user if missing in sandbox
            if not user_check:
                logger.info("Provisioning mock developer seed account 'analytics_dev@cognitive-os.com'...")
                conn.execute(text(
                    """
                    INSERT INTO users (id, email, hashed_password, role, is_active, name, timezone)
                    VALUES (
                        'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf', 
                        'analytics_dev@cognitive-os.com', 
                        'secure_hashed_bcrypt_password', 
                        'premium_user', 
                        true, 
                        'Sarah Jenkins', 
                        'America/New_York'
                    )
                    """
                ))
                user_id = 'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf'
            else:
                user_id = str(user_check[0])
                logger.info(f"Target developer account already exists with ID: {user_id}")

            # Check if example goal exists to prevent duplicate seeds
            goal_check = conn.execute(
                text(f"SELECT id FROM goals WHERE user_id = '{user_id}' AND title = 'Integrate Multi-Agent Swarm Router'")
            ).fetchone()

            if not goal_check:
                logger.info("Seeding productivity, focus, and AI recommendation tables...")
                # Insert Goal
                conn.execute(text(
                    f"""
                    INSERT INTO goals (id, user_id, title, description, target_date, status, completion_percentage, key_results)
                    VALUES (
                        'e44c207d-5a82-4fcf-8472-358eb4bbfb1d',
                        '{user_id}',
                        'Integrate Multi-Agent Swarm Router',
                        'Create unified intent checks and decision logs in backend pipeline.',
                        NOW() + INTERVAL '3 days',
                        'active',
                        45.0,
                        '{{"milestones": [{{"step": "Define DB schema", "done": true}}, {{"step": "Setup REST routes", "done": false}}]}}'::jsonb
                    )
                    """
                ))
                
                # Insert Focus Session
                conn.execute(text(
                    f"""
                    INSERT INTO focus_sessions (id, user_id, goal_id, started_at, ended_at, duration_seconds, interruption_count, context_switch_count, flow_state_score)
                    VALUES (
                        '811a4fdf-9bc0-4e5a-8b83-d5d1c448bb9f',
                        '{user_id}',
                        'e44c207d-5a82-4fcf-8472-358eb4bbfb1d',
                        NOW() - INTERVAL '50 minutes',
                        NOW(),
                        3000,
                        1,
                        4,
                        0.70
                    )
                    """
                ))

                # Insert Telemetry Log 1 (Focused)
                conn.execute(text(
                    f"""
                    INSERT INTO productivity_logs (id, user_id, focus_session_id, timestamp, active_application, window_title, keystroke_count, keystroke_average_gap_ms, mouse_scroll_pixels, app_switch_count, is_distracting, fatigue_index)
                    VALUES (
                        '9ab44ce7-8a1b-44c1-b0a1-7ecd89cadf6c',
                        '{user_id}',
                        '811a4fdf-9bc0-4e5a-8b83-d5d1c448bb9f',
                        NOW() - INTERVAL '30 minutes',
                        'VS Code',
                        'supervisor.py - backend',
                        185,
                        182.5,
                        640,
                        2,
                        false,
                        0.28
                    )
                    """
                ))

                # Insert Telemetry Log 2 (Distracted)
                conn.execute(text(
                    f"""
                    INSERT INTO productivity_logs (id, user_id, focus_session_id, timestamp, active_application, window_title, keystroke_count, keystroke_average_gap_ms, mouse_scroll_pixels, app_switch_count, is_distracting, fatigue_index)
                    VALUES (
                        'fb5c4d0e-26d9-482a-9e1d-d249f3e481bf',
                        '{user_id}',
                        '811a4fdf-9bc0-4e5a-8b83-d5d1c448bb9f',
                        NOW() - INTERVAL '10 minutes',
                        'Chrome (YouTube)',
                        'Lo-fi ambient background music - YouTube',
                        20,
                        940.0,
                        1420,
                        6,
                        true,
                        0.68
                    )
                    """
                ))

                # Insert AI Recommendation
                conn.execute(text(
                    f"""
                    INSERT INTO ai_recommendations (id, user_id, title, category, description, priority_score, is_actionable, action_payload, status)
                    VALUES (
                        'bfa8022a-cfd0-4228-a53b-e018d9cc57df',
                        '{user_id}',
                        'Delegate Shell Deployments to Execution Swarm',
                        'delegation',
                        'Scroll velocity diagnostics show 35 minutes spent manually configuring Docker containers. Delegate script generation to the supervisor execution agent.',
                        0.92,
                        true,
                        '{{"workflow": "coder_agent_delegation", "task": "generate docker deployment script"}}'::jsonb,
                        'pending'
                    )
                    """
                ))
                logger.info("Example productivity analytics records seeded successfully.")
            else:
                logger.info("Seed data already injected. Skipping seeding phase.")

        logger.info("Migration completed successfully! All tables, indexes, and seed records are active on Neon.")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
