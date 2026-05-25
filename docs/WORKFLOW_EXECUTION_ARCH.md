# Cognitive OS — Workflow Execution Architecture (Production)

## 1. User Trigger Layer
The entry point for all automations. Triggers can be synchronous (user chat) or asynchronous (external events).
- **Manual Trigger:** Direct user command via Next.js UI -> `/api/v1/engine/process-query`.
- **Temporal Trigger:** Scheduled tasks (Cron) managed by a Redis-backed scheduler (e.g., Celery Beat).
- **Webhook Trigger:** External events (GitHub PR, Email received) hitting a dedicated FastAPI webhook endpoint.
- **AI Condition Trigger:** The Decision Engine detects a pattern in memory and suggests/triggers an automation.

## 2. AI Decision Engine
The **Pre-Frontal Cortex** analyzes the trigger context and determines the "Next Best Action."
- **Prioritization:** Scores the automation against the user's current high-level goals.
- **DAG Generation:** If the task is complex, the **Planning Agent** decomposes it into a Directed Acyclic Graph (DAG) of agent calls.

## 3. Workflow Router
The **Traffic Controller** dispatches individual steps of the DAG to the correct specialized agents.
- **Dynamic Routing:** Ensures the `EmailAgent` handles communication and the `ResearchAgent` handles data gathering.
- **Load Balancing:** Monitors agent availability via circuit breakers.

## 4. Action Executor
The **Hands of the OS**. Implemented in the `ExecutionAgent`.
- **Modular Tools:** A registry of Python functions/APIs (SendGrid, Twilio, Google Calendar, Custom Webhooks).
- **Async Processing:** Tasks are pushed to a **Redis Queue** (TaskIQ/Celery) to prevent blocking the main API thread.
- **State Management:** Updates the `workflow_executions` table in PostgreSQL at every step.

## 5. Notification System
Keeps the user informed of background progress.
- **WebSockets:** Real-time status updates (`task.status.updated`) pushed to the Next.js frontend.
- **Email/Push:** Fallback notifications for long-running or mission-critical tasks (handled by the Execution Agent).

## 6. Memory Update Layer
The **Hippocampus**. Every automation outcome is persisted.
- **Grounded Learning:** Successful automations are stored in **Pinecone/ChromaDB** as "Procedural Memories."
- **Context Enrichment:** The result of Step N becomes the context for Step N+1 and future workflows.

## 7. Automation Logs Database (PostgreSQL)
A relational record of everything that happened.
- **`workflow_definitions`**: The blueprints (JSON DAGs).
- **`workflow_executions`**: High-level status (Pending, Running, Completed).
- **`workflow_step_logs`**: Atomic logs for every agent call, including inputs, outputs, and retry counts.

---

## Workflow Diagram Description
1.  **TRIGGER** -> [User Message | Webhook | Cron]
2.  **ROUTER** -> Detect Workflow Type
3.  **DECISION ENGINE** -> Create/Retrieve Task DAG
4.  **REDIS QUEUE** -> Enqueue DAG Steps
5.  **EXECUTION AGENT** -> Run Step 1 (e.g., Fetch Data) -> Update PostgreSQL
6.  **EXECUTION AGENT** -> Run Step 2 (e.g., Summarize) -> Update PostgreSQL
7.  **MEMORY AGENT** -> Store Result in Vector DB
8.  **WEBSOCKET** -> Notify Frontend of Completion

---

## Failure Recovery Strategy
- **Exponential Backoff:** If an API call fails (e.g., OpenAI/SendGrid), the system retries 3 times with increasing delays (2s, 4s, 8s).
- **Circuit Breaking:** If an agent consistently fails, the Supervisor "breaks the circuit" and provides a safe fallback (e.g., "Manual intervention required").
- **Partial Completion:** If a 5-step DAG fails at step 4, the state is saved as `partially_completed`. The user can "Resume" from the failed step after fixing the blocker.
- **Audit Trails:** Every failure is logged with a full `error_log` stack trace in PostgreSQL for post-mortem analysis.
