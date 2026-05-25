"""
Production-level Workflow Execution Engine for Cognitive OS.
Handles async Task DAGs, PostgreSQL state tracking, and exponential backoff retries.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.engine.memory.context.automation_models import WorkflowExecution, WorkflowStepLog
from app.orchestration.bus import event_bus
from app.core.database import SessionLocal
from app.engine.agents.registry import AgentRegistry

logger = logging.getLogger(__name__)

class EnhancedWorkflowExecutor:
    """
    Orchestrates the lifecycle of a WorkflowExecution.
    
    Features:
    - Persistent state tracking in PostgreSQL.
    - Parallel execution of independent DAG nodes.
    - Exponential backoff retries per step.
    - WebSocket status propagation.
    """

    def __init__(self, execution_id: uuid.UUID):
        self.execution_id = execution_id
        self._results: Dict[str, Any] = {}

    async def run(self):
        """Starts the workflow execution loop."""
        with SessionLocal() as db:
            execution = db.query(WorkflowExecution).filter(WorkflowExecution.id == self.execution_id).first()
            if not execution:
                logger.error(f"Execution {self.execution_id} not found.")
                return

            execution.status = "running"
            db.commit()

            # Load DAG from definition
            dag = execution.definition.dag_json # Expected format: { "nodes": [...], "edges": [...] }
            nodes = dag.get("nodes", [])
            
            pending = list(nodes)
            completed: set[str] = set()
            failed: set[str] = set()

            while pending and execution.status == "running":
                # Find nodes with satisfied dependencies
                ready = [
                    node for node in pending
                    if all(dep in completed for dep in node.get("depends_on", []))
                    and not any(dep in failed for dep in node.get("depends_on", []))
                ]

                if not ready:
                    if pending:
                        logger.warning(f"Workflow {self.execution_id} stalled. Dependencies not met or circular.")
                    break

                # Execute ready steps in parallel
                tasks = [self._execute_step(node, db) for node in ready]
                step_results = await asyncio.gather(*tasks)

                for node, success in zip(ready, step_results):
                    pending.remove(node)
                    if success:
                        completed.add(node["id"])
                    else:
                        failed.add(node["id"])

            # Finalize execution state
            execution.status = "completed" if not failed else "failed"
            execution.completed_at = datetime.now(timezone.utc)
            db.commit()
            
            logger.info(f"Workflow {self.execution_id} finished with status: {execution.status}")

    async def _execute_step(self, node: Dict[str, Any], db) -> bool:
        """Executes a single step with retry logic."""
        step_id = node["id"]
        agent_name = node["agent"]
        instruction = node["instruction"]
        max_retries = node.get("retries", 3)

        # Create step log
        step_log = WorkflowStepLog(
            execution_id=self.execution_id,
            step_id=step_id,
            agent_name=agent_name,
            status="running",
            input_data={"instruction": instruction},
            retry_count=0
        )
        db.add(step_log)
        db.commit()

        for attempt in range(max_retries + 1):
            try:
                step_log.retry_count = attempt
                db.commit()

                # Call Agent via EventBus
                result = await self._dispatch_to_agent(agent_name, instruction)
                
                # Success
                step_log.status = "completed"
                step_log.output_data = {"result": result}
                db.commit()
                self._results[step_id] = result
                return True

            except Exception as e:
                logger.error(f"Step {step_id} failed (Attempt {attempt+1}): {e}")
                if attempt < max_retries:
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                else:
                    step_log.status = "failed"
                    step_log.output_data = {"error": str(e)}
                    db.commit()
                    return False
        
        return False

    async def _dispatch_to_agent(self, agent_name: str, instruction: str) -> str:
        """Lower-level dispatch via EventBus with future-based awaiting."""
        task_id = f"step-{uuid.uuid4().hex[:8]}"
        future: asyncio.Future = asyncio.Future()

        async def on_status(payload: dict) -> None:
            status = payload.get("status")
            if status == "completed" and not future.done():
                future.set_result(payload.get("result", ""))
            elif status == "failed" and not future.done():
                future.set_exception(Exception(payload.get("message", "Agent reported failure")))

        event_bus.subscribe(f"task.status.{task_id}", on_status)

        try:
            await event_bus.publish(f"agent.{agent_name}", {
                "task_id": task_id,
                "task": instruction,
                "parent_id": str(self.execution_id)
            })
            return await asyncio.wait_for(future, timeout=120.0)
        finally:
            event_bus.unsubscribe(f"task.status.{task_id}", on_status)
