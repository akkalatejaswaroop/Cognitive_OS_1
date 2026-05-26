# Cognitive OS — Testing Strategy: Task Automation System

This document outlines the end-to-end testing framework for the Cognitive OS Automation Engine, ensuring reliability, accuracy, and resilience.

---

## 1. Testing Hierarchy

| Tier | Type | Focus | Tools |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Unit** | Individual Agent logic, SPS scoring, DAG validation. | Pytest, Jest |
| **Tier 2** | **Integration** | Event Bus communication, DB persistence, AI Planner -> Executor handoff. | Pytest (Async), Mock OpenAI |
| **Tier 3** | **E2E** | Full Trigger -> Execution -> Notification cycle. | Cypress/Playwright |
| **Tier 4** | **Performance** | Concurrent workflows, Scheduler polling latency. | Locust, k6 |

---

## 2. Key Testing Areas

### A. Workflow Execution & DAG Integrity
- **Test:** Verify that independent DAG nodes run in parallel.
- **Test:** Verify that variable injection (e.g., `{{step_1.result}}`) works correctly.
- **Edge Case:** Circular dependencies in the AI-generated plan should be caught before execution.

### B. Trigger Validation
- **Test:** Prompt triggers correctly initialize the `WorkflowAutomationService`.
- **Test:** Cron triggers in `ScheduledTask` fire within 60s of their `next_run_at`.

### C. Smart Reminder Accuracy
- **Test:** SPS (Smart Priority Score) correctly ranks reminders based on urgency and context.
- **Test:** Snooze interactions correctly trigger adaptive learning (SPS decay).

### D. Email Drafting Quality
- **Test:** Verify structured JSON output from LLM for all tone variants.
- **Test:** Ensure sensitive data is not hallucinated in drafts.

### E. Failure Recovery (The "Resilience" Test)
- **Test:** Workflow fails at Step 2; Step 1 remains "completed".
- **Test:** Resume endpoint (`/resume/{id}`) skips Step 1 and restarts at Step 2.
- **Test:** Exponential backoff jitter prevents API rate limiting during retries.

---

## 3. Automation QA Checklist

- [ ] **Deterministic Scoring:** Does the same context yield the same SPS (within 5%)?
- [ ] **State Persistence:** Do logs survive a worker process crash?
- [ ] **Concurrency:** Can the engine handle 50 parallel DAG steps without DB locks?
- [ ] **Token Efficiency:** Does the Resume logic avoid redundant LLM calls?
- [ ] **Notification Delivery:** Is the WebSocket/Dashboard alert triggered within 1s of completion?

---

## 4. Performance Benchmarks (Targets)

- **Workflow Initiation:** < 2s (Prompt to RUNNING state).
- **Event Bus Latency:** < 100ms (Publish to Subscriber pickup).
- **Scheduler Poll:** < 500ms for 1000 active tasks.
- **UI Refresh:** < 200ms for state updates on Dashboard.
