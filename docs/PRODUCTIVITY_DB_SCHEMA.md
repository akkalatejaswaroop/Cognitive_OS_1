# Cognitive OS — Productivity Analytics Database Schema
## Production-Grade PostgreSQL DDL Schema, Index Optimizations, and Advanced SQL Analytics

> [!NOTE]
> This schema is designed for PostgreSQL 15+ environments, supporting serverless pooling constraints (e.g. Neon Postgres) and optimized indexing for high-frequency telemetry streams. It complements the existing multi-agent schemas in Cognitive OS.

---

## 1. Relational Database Schema (DDL)

The DDL script below defines the target tables with explicit constraints, UUID primaries, foreign keys, delete-cascades, and default timezone-aware timestamps.

```sql
-- Enable UUID extension in database if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE (Existed in core; registered here to map relationship constraints)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    name VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'UTC' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 2. GOALS TABLE (Goal Tracking Engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- 3. TASK HISTORY TABLE (Task Ingestion & State Transitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- 4. FOCUS SESSIONS TABLE (Focus Time Analysis / Pomodoro Cycles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- 5. PRODUCTIVITY LOGS TABLE (Real-time Telemetry Cadence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS productivity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- 6. COGNITIVE LOAD & AI RECOMMENDATIONS TABLE (Actionable Pacing Tips)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================================
-- 7. ANALYTICS REPORTS TABLE (Daily / Weekly Distillations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('daily', 'weekly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    markdown_content TEXT NOT NULL,
    metrics_summary JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 8. SYSTEM ACTIVITY LOGS TABLE (Security Telemetry / Swarm Logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(100),
    user_agent VARCHAR(500),
    action_type VARCHAR(100) NOT NULL,
    severity_level VARCHAR(50) DEFAULT 'info' NOT NULL CHECK (severity_level IN ('info', 'warning', 'error', 'critical')),
    metadata_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 2. Advanced Index Optimizations

High-frequency telemetry writes (e.g. `productivity_logs` incoming packets once every 60 seconds) can trigger index bloat and query slow-downs if unoptimized. We define target indexes to cover fast range scans and JSON searches:

```sql
-- 1. B-Tree index covering the primary timestamp filter on high-frequency telemetry logs
CREATE INDEX IF NOT EXISTS idx_prod_logs_user_timestamp 
ON productivity_logs (user_id, timestamp DESC);

-- 2. B-Tree index on focus sessions started bounds to accelerate trend aggregations
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started 
ON focus_sessions (user_id, started_at DESC);

-- 3. GIN index to speed up searches inside the goals Key Results JSONB document structure
CREATE INDEX IF NOT EXISTS idx_goals_key_results 
ON goals USING gin (key_results);

-- 4. B-Tree index on active goals list to speed up dashboard timeline loads
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals (user_id, status) WHERE status = 'active';

-- 5. B-Tree index on recommendations status to retrieve pending elements quickly
CREATE INDEX IF NOT EXISTS idx_ai_recs_user_pending 
ON ai_recommendations (user_id, status) WHERE status = 'pending';

-- 6. B-Tree index on system activity logs for security diagnostics audits
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity_timestamp 
ON activity_logs (severity_level, created_at DESC);
```

---

## 3. High-Fidelity PostgreSQL Analytics Queries

We define the optimized SQL aggregation queries executed by the `ProductivityAnalyticsService` dashboard hydrators.

### A. Context Switch Rates & Distraction Ratios (Last 7 Days)
```sql
SELECT 
    DATE_TRUNC('day', timestamp) AS active_day,
    ROUND(SUM(app_switch_count) / NULLIF(COUNT(id) / 60.0, 0), 2) AS switches_per_hour,
    ROUND(COUNT(CASE WHEN is_distracting = TRUE THEN 1 END)::DECIMAL / COUNT(id) * 100, 2) AS distraction_percentage,
    ROUND(AVG(fatigue_index)::DECIMAL, 2) AS average_fatigue
FROM productivity_logs
WHERE user_id = :user_id 
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY active_day
ORDER BY active_day ASC;
```

### B. Dynamic Task Completion Speed versus Estimation Discrepancies
```sql
SELECT 
    COUNT(id) AS total_tasks_completed,
    ROUND(AVG(actual_duration_minutes), 1) AS average_actual_minutes,
    ROUND(AVG(actual_duration_minutes - estimated_duration_minutes), 1) AS average_discrepancy_minutes,
    ROUND(
        COUNT(CASE WHEN actual_duration_minutes <= estimated_duration_minutes THEN 1 END)::DECIMAL 
        / NULLIF(COUNT(id), 0) * 100, 2
    ) AS percentage_on_time
FROM task_history
WHERE user_id = :user_id 
  AND status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days';
```

### C. Weekly Flow Stability & Fatigue Matrix Analysis
```sql
SELECT 
    fs.id AS session_id,
    g.title AS linked_goal,
    fs.duration_seconds / 60 AS focus_duration_minutes,
    fs.flow_state_score,
    fs.interruption_count,
    ROUND(AVG(pl.fatigue_index)::DECIMAL, 2) AS session_average_fatigue
FROM focus_sessions fs
LEFT JOIN goals g ON fs.goal_id = g.id
LEFT JOIN productivity_logs pl ON pl.focus_session_id = fs.id
WHERE fs.user_id = :user_id
  AND fs.started_at >= NOW() - INTERVAL '7 days'
  AND fs.ended_at IS NOT NULL
GROUP BY fs.id, g.title, fs.duration_seconds, fs.flow_state_score, fs.interruption_count
ORDER BY fs.started_at DESC;
```

---

## 4. Relationship Diagram Explanation

The relational structure enforces high-integrity cascades, user segmentation, and flexible foreign key associations.

```
                  +-------------------+
                  |       USERS       |
                  +-------------------+
                    |   |   |   |   |
         +----------+   |   |   |   +----------+
         |              |   |   |              |
         v              |   |   v              v
+---------------+       |   | +------------+ +---------------+
| ACTIVITY_LOGS |       |   | |  REPORTS   | |   AI_RECS     |
+---------------+       |   | +------------+ +---------------+
                        |   |
            +-----------+   +-------------+
            |                             |
            v                             v
+-----------------------+     +-----------------------+
|         GOALS         |     |    FOCUS_SESSIONS     |
+-----------------------+     +-----------------------+
  |                   |         ^                   |
  | ON DELETE CASCADE |         | ON DELETE SET NULL|
  v                   |         |                   v
+-------------------+ |         |      +---------------------+
|   TASK_HISTORY    | +---------+      |  PRODUCTIVITY_LOGS  |
+-------------------+                  +---------------------+
```

### Key Relationships & Cardinalities:
1. **User - Segments (1:N)**: A single `User` possesses multiple `goals`, `focus_sessions`, `ai_recommendations`, `productivity_logs`, and system `activity_logs`. If a user account is deleted, database cascades (`ON DELETE CASCADE`) recursively purge all related telemetry, preserving transactional isolation.
2. **Goals - Focus / Task Links (1:N)**: A `ProductivityGoal` can track multiple `task_history` segments and `focus_sessions`. If a goal is completed or deleted, foreign key assignments on focus and task trackers degrade gracefully to null values (`ON DELETE SET NULL`), preventing orphan record collisions.
3. **Focus Sessions - Productivity Telemetry (1:N)**: A focus session acts as the grouping anchor for high-frequency `productivity_logs`. As telemetry arrives once every 60 seconds, it saves the current `focus_session_id` to evaluate average flow-scores at the end of the Pomodoro cycle.

---

## 5. Sample Ingestion Records (Database Seed)

```sql
-- 1. Seed Developer User
INSERT INTO users (id, email, hashed_password, role, is_active, name, timezone)
VALUES (
    'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf', 
    'analytics_dev@cognitive-os.com', 
    'secure_hashed_bcrypt_password', 
    'premium_user', 
    true, 
    'Sarah Jenkins', 
    'America/New_York'
);

-- 2. Seed High-Level Active Goal
INSERT INTO goals (id, user_id, title, description, target_date, status, completion_percentage, key_results)
VALUES (
    'e44c207d-5a82-4fcf-8472-358eb4bbfb1d',
    'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf',
    'Integrate Multi-Agent Swarm Router',
    'Create unified intent checks and decision logs in backend pipeline.',
    NOW() + INTERVAL '3 days',
    'active',
    45.0,
    '{"milestones": [{"step": "Define DB schema", "done": true}, {"step": "Setup REST routes", "done": false}]}'::jsonb
);

-- 3. Seed Focus Session
INSERT INTO focus_sessions (id, user_id, goal_id, started_at, ended_at, duration_seconds, interruption_count, context_switch_count, flow_state_score)
VALUES (
    '811a4fdf-9bc0-4e5a-8b83-d5d1c448bb9f',
    'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf',
    'e44c207d-5a82-4fcf-8472-358eb4bbfb1d',
    NOW() - INTERVAL '50 minutes',
    NOW(),
    3000, -- 50 minutes duration
    1,    -- 1 interruption
    4,    -- 4 switches
    0.70  -- Flow state index
);

-- 4. Seed Productive Telemetry Log Entry
INSERT INTO productivity_logs (id, user_id, focus_session_id, timestamp, active_application, window_title, keystroke_count, keystroke_average_gap_ms, mouse_scroll_pixels, app_switch_count, is_distracting, fatigue_index)
VALUES (
    '9ab44ce7-8a1b-44c1-b0a1-7ecd89cadf6c',
    'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf',
    '811a4fdf-9bc0-4e5a-8b83-d5d1c448bb9f',
    NOW() - INTERVAL '30 minutes',
    'VS Code',
    'supervisor.py - backend',
    185,
    182.5,
    640,
    2,
    false,
    0.28 -- Low fatigue index
);

-- 5. Seed Distracted Telemetry Log Entry
INSERT INTO productivity_logs (id, user_id, focus_session_id, timestamp, active_application, window_title, keystroke_count, keystroke_average_gap_ms, mouse_scroll_pixels, app_switch_count, is_distracting, fatigue_index)
VALUES (
    'fb5c4d0e-26d9-482a-9e1d-d249f3e481bf',
    'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf',
    '811a4fdf-9bc0-4e5a-8b83-d5d1c448bb9f',
    NOW() - INTERVAL '10 minutes',
    'Chrome (YouTube)',
    'Lo-fi ambient background music - YouTube',
    20,
    940.0, -- High key delays
    1420,
    6,
    true, -- Distraction flagged
    0.68 -- elevated fatigue
);

-- 6. Seed AI Recommendation
INSERT INTO ai_recommendations (id, user_id, title, category, description, priority_score, is_actionable, action_payload, status)
VALUES (
    'bfa8022a-cfd0-4228-a53b-e018d9cc57df',
    'd159a6fe-4f1b-4cd3-a85f-8ce69f88c3cf',
    'Delegate Shell Deployments to Execution Swarm',
    'delegation',
    'Scroll velocity diagnostics show 35 minutes spent manually configuring Docker containers. Delegate script generation to the supervisor execution agent.',
    0.92,
    true,
    '{"workflow": "coder_agent_delegation", "task": "generate docker deployment script"}'::jsonb,
    'pending'
);
```
