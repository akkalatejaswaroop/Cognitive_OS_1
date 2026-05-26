"""
Workflow Automation Service — The "Cognitive Runtime" of Cognitive OS.
Handles natural language triggers, context analysis, dynamic DAG generation, and execution.
"""
from __future__ import annotations

import logging
import uuid
import json
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

from app.engine.agents.planning_agent import PlanningAgent
from app.engine.memory.context.automation_models import Automation, WorkflowHistory
from app.engine.automation.executor import EnhancedWorkflowExecutor
from app.models.domain import User, Notification

logger = logging.getLogger("automation_service")

class WorkflowAutomationService:
    """
    Main entry point for AI-powered task automation.
    Implements the Trigger -> Analyze -> Plan -> Execute pipeline.
    """

    def __init__(self, db: Session):
        self.db = db
        self.planner = PlanningAgent()

    async def trigger_from_prompt(
        self, 
        user: User, 
        prompt: str, 
        background_tasks: Optional[BackgroundTasks] = None
    ) -> WorkflowHistory:
        """
        Takes a natural language prompt and executes a dynamic workflow.
        """
        logger.info(f"Service: Triggering automation for user {user.id}: '{prompt}'")

        # 1. AI Analysis (Context Gathering)
        # Fetch episodic memory context (simulated for now)
        context_data = await self._get_user_context(user)
        enriched_prompt = f"Context: {context_data}\nGoal: {prompt}"

        # 2. AI Planning: Decompose into Task DAG
        plan_json = await self.planner.execute(enriched_prompt)
        plan_data = json.loads(plan_json) 
        
        nodes = []
        for st in plan_data.get("subtasks", []):
            nodes.append({
                "id": st["sub_task_id"],
                "agent": st["agent"],
                "instruction": st["description"],
                "depends_on": st.get("depends_on", []),
                "retries": 3
            })
        
        dag_definition = {"nodes": nodes}

        # 3. Persistence: Blueprint & Execution Record
        automation = Automation(
            user_id=user.id,
            name=f"Workflow: {prompt[:30]}...",
            description=f"AI-generated for: {prompt}",
            dag_definition=dag_definition,
            is_active=False
        )
        self.db.add(automation)
        self.db.commit()

        execution = WorkflowHistory(
            automation_id=automation.id,
            user_id=user.id,
            input_payload={"prompt": prompt, "context": context_data},
            status="pending"
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        # 4. Execution: Async Handoff
        # The EnhancedWorkflowExecutor handles retries, parallel tasks, and state logging.
        executor = EnhancedWorkflowExecutor(execution.id)
        
        if background_tasks:
            background_tasks.add_task(self._run_executor_with_notification, executor, user, execution.id)
        else:
            import asyncio
            asyncio.create_task(self._run_executor_with_notification(executor, user, execution.id))

        return execution

    async def _run_executor_with_notification(self, executor: EnhancedWorkflowExecutor, user: User, execution_id: uuid.UUID):
        """Runs the executor and sends a system notification upon completion."""
        try:
            await executor.run()
            
            # Post-execution: Create Notification
            # Re-fetch the history in a new session to avoid async issues
            from app.core.database import SessionLocal
            with SessionLocal() as db:
                hist = db.query(WorkflowHistory).filter(WorkflowHistory.id == execution_id).first()
                if hist:
                    notif = Notification(
                        user_id=user.id,
                        title="Automation Finished",
                        message=f"Workflow '{hist.automation.name}' {hist.status}.",
                        is_read=False
                    )
                    db.add(notif)
                    db.commit()
        except Exception as e:
            logger.error(f"Service: Execution {execution_id} crashed: {e}")

    async def resume_execution(
        self, 
        execution_id: uuid.UUID, 
        background_tasks: Optional[BackgroundTasks] = None
    ) -> WorkflowHistory:
        """
        Resumes a failed or partial execution.
        """
        execution = self.db.query(WorkflowHistory).filter(WorkflowHistory.id == execution_id).first()
        if not execution:
            raise ValueError(f"Execution {execution_id} not found.")

        if execution.status not in ["failed", "partial", "stopped"]:
            logger.warning(f"Execution {execution_id} is in status '{execution.status}', cannot resume.")
            return execution

        # Reset status for resume
        execution.status = "pending"
        self.db.commit()

        executor = EnhancedWorkflowExecutor(execution.id)
        if background_tasks:
            background_tasks.add_task(self._run_executor_with_notification, executor, execution.user, execution.id)
        else:
            import asyncio
            asyncio.create_task(self._run_executor_with_notification(executor, execution.user, execution.id))

        return execution

    async def _get_user_context(self, user: User) -> str:
        """Simulates RAG context retrieval."""
        return "User prefers Python for scripts. Working on 'Cognitive-OS-v1'."
