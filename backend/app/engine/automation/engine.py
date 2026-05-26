"""
Cognitive OS — Workflow Execution Engine (Cognitive Runtime)
Implements the end-to-end logic from Trigger -> Analysis -> Execution -> Notification.
"""
from __future__ import annotations

import logging
import uuid
import json
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.engine.agents.planning_agent import PlanningAgent
from app.engine.agents.registry import AgentRegistry
from app.engine.memory.context.automation_models import Automation, WorkflowHistory, AutomationLog
from app.engine.automation.executor import EnhancedWorkflowExecutor
from app.models.domain import User, Notification
from app.orchestration.bus import event_bus

logger = logging.getLogger("workflow_engine")

class WorkflowExecutionEngine:
    """
    The central runtime for Cognitive OS workflows.
    """

    def __init__(self, db: Session):
        self.db = db
        self.planner = PlanningAgent()
        self.registry = AgentRegistry.get()

    async def run_workflow(
        self, 
        user: User, 
        prompt: str, 
        trigger_context: Optional[Dict[str, Any]] = None
    ) -> uuid.UUID:
        """
        Executes the full Cognitive OS workflow pipeline.
        """
        logger.info(f"Engine: New workflow trigger for User {user.id}")

        # 1. AI Analyzes Context (Internal Analysis before Planning)
        # In a real app, this would query MemoryAgent for episodic/semantic context.
        # For now, we simulate gathering memory context.
        memory_context = await self._gather_context(user, prompt)
        
        # 2. Planning: Generate the Task DAG
        # We enrich the prompt with gathered context
        enriched_prompt = f"Context: {memory_context}\nTask: {prompt}"
        plan_json = await self.planner.execute(enriched_prompt)
        plan_data = json.loads(plan_json)
        
        # 3. Persistence: Store Blueprint & History
        nodes = []
        for st in plan_data.get("subtasks", []):
            nodes.append({
                "id": st["sub_task_id"],
                "agent": st["agent"],
                "instruction": st["description"],
                "depends_on": st.get("depends_on", []),
                "retries": 3,
                "critical": True # Default to critical
            })
        
        dag_definition = {"nodes": nodes}

        automation = Automation(
            user_id=user.id,
            name=f"Workflow: {prompt[:40]}",
            description=f"AI-generated for prompt: {prompt}",
            dag_definition=dag_definition,
            is_active=False
        )
        self.db.add(automation)
        self.db.commit()

        execution = WorkflowHistory(
            automation_id=automation.id,
            user_id=user.id,
            input_payload={"prompt": prompt, "trigger_context": trigger_context, "analysis": memory_context},
            status="pending"
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        # 4. Task Execution: Hand off to Executor
        # The executor handles parallel tasks, retries, and state logging.
        executor = EnhancedWorkflowExecutor(execution.id)
        
        # Fire and forget the execution loop
        asyncio.create_task(self._execute_and_notify(executor, user, execution.id))

        return execution.id

    async def _execute_and_notify(self, executor: EnhancedWorkflowExecutor, user: User, execution_id: uuid.UUID):
        """Runs the executor and handles the final notification step."""
        try:
            await executor.run()
            
            # 5. Result Storage: Already handled by executor in automation_logs
            
            # 6. User Notification
            # Re-fetch for final status
            with self.db.begin_nested(): # Use a sub-transaction if needed
                # Actually we need a fresh session or just refresh the object
                # But we are in a background task, so we should manage DB session carefully.
                from app.core.database import SessionLocal
                with SessionLocal() as db_session:
                    execution = db_session.query(WorkflowHistory).filter(WorkflowHistory.id == execution_id).first()
                    if execution:
                        msg = f"Workflow '{execution.automation.name}' {execution.status}."
                        notif = Notification(
                            user_id=user.id,
                            title="Workflow Execution",
                            message=msg,
                            is_read=False
                        )
                        db_session.add(notif)
                        db_session.commit()
                        logger.info(f"Engine: Notification sent for execution {execution_id}")

        except Exception as e:
            logger.error(f"Engine: Execution failed for {execution_id}: {e}")

    async def _gather_context(self, user: User, prompt: str) -> str:
        """Simulates gathering context from Memory Agent."""
        # In production, this calls agent.memory-agent
        return f"User prefers concise emails. Last project mentioned: 'Cognitive-OS'."

    async def resume_workflow(self, execution_id: uuid.UUID, user: User):
        """Resumes a workflow from the last failure point."""
        executor = EnhancedWorkflowExecutor(execution_id)
        asyncio.create_task(self._execute_and_notify(executor, user, execution_id))
