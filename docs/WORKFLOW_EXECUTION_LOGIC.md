# Cognitive OS — Workflow Execution Logic System

This document specifies the internal logic, state transitions, and orchestration patterns for the **Cognitive OS Workflow Engine**.

---

### 1. State Machine Logic
The system uses a persistent state machine stored in PostgreSQL to ensure durability across restarts.

| State | Description | Transitions To |
| :--- | :--- | :--- |
| **PENDING** | Trigger detected, plan (DAG) is being generated or waiting in queue. | RUNNING, FAILED |
| **RUNNING** | Executor is active. Steps are being dispatched to agents in parallel. | COMPLETED, FAILED, PARTIAL |
| **COMPLETED** | All nodes in the Task DAG finished with `success`. | (Terminal) |
| **FAILED** | A critical node failed after maximum retries. | PENDING (via Resume) |
| **PARTIAL** | Some optional nodes failed, but the core objective was met. | (Terminal) |
| **SNOOZED** | (Reminders only) User requested delay. Adaptive learning lowers priority. | PENDING |

**Transition Rule:** A workflow cannot move to `COMPLETED` unless all leaf nodes in the DAG reach `success`. If a parent node fails, its children are never queued.

---

### 2. Workflow Orchestration
Orchestration is handled by the `WorkflowAutomationService` (Design/Blueprint) and the `EnhancedWorkflowExecutor` (Execution/Runtime).

1.  **Selection:** The service identifies the trigger (Cron, Webhook, or Prompt).
2.  **Decomposition:** The `PlanningAgent` generates a JSON DAG.
3.  **Instantiation:** A `WorkflowHistory` record is created.
4.  **Loop:** The Executor finds "Ready" nodes (all dependencies met) and runs them.

---

### 3. Retry System (Exponential Backoff)
Every atomic step in a workflow is wrapped in a retry wrapper.
*   **Initial Delay:** 1 second.
*   **Multiplier:** 2x.
*   **Jitter:** +/- 10% to prevent "Thundering Herd" on external APIs.
*   **Max Retries:** Default 3 (Configurable per node).

---

### 4. Queue Management & Event Bus
*   **Queue:** Uses an `asyncio.PriorityQueue` within the `EventBus`.
*   **Prioritization:** Messages are assigned a `Priority` enum (CRITICAL, HIGH, NORMAL, LOW).
*   **Concurrency:** The `EventBus` processes messages concurrently using worker tasks, ensuring non-blocking execution.

---

### 5. Event-based Execution Flow
Communication follows the **Mediator + Pub/Sub** pattern:
1.  **Publish:** Executor publishes to `agent.{agent_name}`.
2.  **Subscribe:** Agent processes and publishes to `task.status.{task_id}`.
3.  **Await:** Executor awaits a `Future` resolved by the status event.

---

### 6. Logic Pseudocode

```python
class WorkflowEngine:
    async def process_trigger(self, trigger):
        context = await AI_Analyze(trigger)
        dag = await AI_Planner.generate_plan(context)
        execution_id = await DB.persist_plan(dag)
        await self.execute(execution_id)

    async def execute(self, execution_id):
        while not self.is_dag_complete(execution_id):
            ready_nodes = self.find_ready_nodes(execution_id)
            if not ready_nodes: break
            
            # Execute in parallel
            await asyncio.gather(*[
                self.run_node_with_retry(node) for node in ready_nodes
            ])
        
        await self.notify_user(execution_id)

    async def run_node_with_retry(self, node):
        for attempt in range(MAX_RETRIES):
            try:
                result = await EventBus.call(node.agent, node.payload)
                await DB.log_success(node.id, result)
                return True
            except:
                await sleep(2 ** attempt)
        await DB.log_failure(node.id)
        return False
```

---

### 7. Sequence Diagram Explanation

1.  **[TRIGGER]**: An external event (e.g., Email received) hits the FastAPI gateway.
2.  **[ANALYSIS]**: `WorkflowAutomationService` calls `PlanningAgent`.
3.  **[PLANNING]**: AI returns a DAG: `[Analyze Email] -> [Draft Reply] -> [Set Reminder]`.
4.  **[RUNTIME]**: `EnhancedWorkflowExecutor` starts.
5.  **[DISPATCH]**: Executor sends `Analyze Email` task to `ResearchAgent` via `EventBus`.
6.  **[PUB/SUB]**: `ResearchAgent` completes and publishes a success event.
7.  **[PROPAGATION]**: Executor receives result, injects it into the `Draft Reply` payload, and triggers the next parallel set.
8.  **[MEMORY]**: All results are saved to `automation_logs` and `WorkflowHistory`.
9.  **[NOTIFICATION]**: Upon `COMPLETED` state, a `Notification` is created for the user's dashboard.
