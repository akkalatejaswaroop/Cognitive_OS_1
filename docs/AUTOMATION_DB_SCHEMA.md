# Cognitive OS — Task Automation System Database Schema

## 1. SQL Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Core Identity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    firebase_uid VARCHAR(128) UNIQUE,
    preferences JSONB DEFAULT '{}',
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Automations Table (Workflow Definitions)
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dag_definition JSONB NOT NULL, -- The Task Graph (Nodes/Edges)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workflow History Table (Execution Instances)
CREATE TABLE IF NOT EXISTS workflow_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    input_payload JSONB DEFAULT '{}',
    output_result JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    error_log TEXT
);

-- 4. Reminders Table (Time-based Alerts)
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, snoozed, dismissed
    priority INT DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Email Drafts Table (Pending Communications)
CREATE TABLE IF NOT EXISTS email_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, discarded
    context_source_id UUID, -- Reference to the memory or meeting that generated this
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Automation Logs Table (Atomic Step Tracking)
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    history_id UUID NOT NULL REFERENCES workflow_history(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50), -- running, completed, failed
    input_data JSONB,
    output_data JSONB,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Scheduled Tasks Table (Triggers/Cron)
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
    trigger_type VARCHAR(50) NOT NULL, -- cron, webhook, ai_event
    schedule_expression VARCHAR(100), -- e.g. "0 9 * * *"
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for Scalability
CREATE INDEX idx_automations_user_id ON automations(user_id);
CREATE INDEX idx_workflow_history_status ON workflow_history(status);
CREATE INDEX idx_reminders_due_at ON reminders(due_at);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at) WHERE is_enabled = TRUE;
```

## 2. Prisma Schema (Type-Safe ORM)

```prisma
// datasource and generator config omitted for brevity

model User {
  id                    String              @id @default(uuid())
  email                 String              @unique
  full_name             String?
  firebase_uid          String?             @unique
  preferences           Json                @default("{}")
  timezone              String              @default("UTC")
  created_at            DateTime            @default(now())
  updated_at            DateTime            @updated_at
  automations           Automation[]
  workflow_histories    WorkflowHistory[]
  reminders             Reminder[]
  email_drafts          EmailDraft[]
  scheduled_tasks       ScheduledTask[]

  @@map("users")
}

model Automation {
  id              String            @id @default(uuid())
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String
  name            String
  description     String?
  dag_definition  Json
  is_active       Boolean           @default(true)
  created_at      DateTime          @default(now())
  updated_at      DateTime          @updated_at
  history         WorkflowHistory[]
  scheduled_tasks ScheduledTask[]

  @@map("automations")
}

model WorkflowHistory {
  id              String            @id @default(uuid())
  automation      Automation        @relation(fields: [automationId], references: [id], onDelete: Cascade)
  automationId    String
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String
  status          String            @default("pending")
  input_payload   Json              @default("{}")
  output_result   Json              @default("{}")
  started_at      DateTime          @default(now())
  completed_at    DateTime?
  error_log       String?
  logs            AutomationLog[]

  @@map("workflow_history")
}

model Reminder {
  id          String   @id @default(uuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  content     String
  due_at      DateTime
  status      String   @default("active")
  priority    Int      @default(3)
  metadata    Json     @default("{}")
  created_at  DateTime @default(now())

  @@map("reminders")
}

model EmailDraft {
  id                String   @id @default(uuid())
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  recipient         String
  subject           String?
  body              String?
  status            String   @default("draft")
  context_source_id String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updated_at

  @@map("email_drafts")
}

model AutomationLog {
  id          String          @id @default(uuid())
  history     WorkflowHistory @relation(fields: [historyId], references: [id], onDelete: Cascade)
  historyId   String
  step_id     String
  agent_name  String
  status      String?
  input_data  Json?
  output_data Json?
  retry_count Int             @default(0)
  created_at  DateTime        @default(now())

  @@map("automation_logs")
}

model ScheduledTask {
  id                  String      @id @default(uuid())
  user                User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId              String
  automation          Automation? @relation(fields: [automationId], references: [id], onDelete: SetNull)
  automationId        String?
  trigger_type        String
  schedule_expression String?
  last_run_at         DateTime?
  next_run_at         DateTime?
  is_enabled          Boolean     @default(true)
  created_at          DateTime    @default(now())

  @@map("scheduled_tasks")
}
```

## 3. Example Records

```sql
-- Insert a User
INSERT INTO users (email, full_name, firebase_uid, timezone)
VALUES ('alex@example.com', 'Alex Chen', 'firebase_alex_123', 'America/New_York');

-- Create an Automation (Meeting Synthesis Workflow)
INSERT INTO automations (user_id, name, description, dag_definition)
VALUES (
    (SELECT id FROM users WHERE email = 'alex@example.com'),
    'Weekly Project Sync',
    'Summarizes meeting and drafts follow-up email.',
    '{
        "nodes": [
            {"id": "step_1", "agent": "summary-agent", "instruction": "Summarize transcript"},
            {"id": "step_2", "agent": "execution-agent", "instruction": "Draft team email", "depends_on": ["step_1"]}
        ]
    }'
);

-- Record an Execution Instance
INSERT INTO workflow_history (automation_id, user_id, status, input_payload)
VALUES (
    (SELECT id FROM automations WHERE name = 'Weekly Project Sync'),
    (SELECT id FROM users WHERE email = 'alex@example.com'),
    'completed',
    '{"transcript": "..."}'
);

-- Add a Step Log
INSERT INTO automation_logs (history_id, step_id, agent_name, status, output_data)
VALUES (
    (SELECT id FROM workflow_history LIMIT 1),
    'step_1',
    'summary-agent',
    'completed',
    '{"summary": "Decided to launch on June 1st."}'
);

-- Set a Reminder
INSERT INTO reminders (user_id, content, due_at, priority)
VALUES (
    (SELECT id FROM users WHERE email = 'alex@example.com'),
    'Check Project Alpha launch readiness',
    '2026-05-30 09:00:00-05',
    1
);

-- Schedule a Task
INSERT INTO scheduled_tasks (user_id, automation_id, trigger_type, schedule_expression, next_run_at)
VALUES (
    (SELECT id FROM users WHERE email = 'alex@example.com'),
    (SELECT id FROM automations WHERE name = 'Weekly Project Sync'),
    'cron',
    '0 9 * * 1', -- Every Monday at 9am
    '2026-06-01 09:00:00-04'
);
```
