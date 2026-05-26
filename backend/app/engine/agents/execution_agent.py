"""
Execution Agent for Cognitive OS
Responsible for executing workflow tasks, triggering APIs, sending emails, 
scheduling reminders, and tracking task status asynchronously.
"""
from __future__ import annotations

import asyncio
import logging
from enum import Enum
from typing import Any, Callable, Awaitable

from app.engine.agents.base import BaseAgent
from app.llm.factory import get_llm_provider
from app.engine.prompts.email import EMAIL_DRAFTING_SYSTEM_PROMPT, EMAIL_DRAFTING_USER_PROMPT
from app.engine.prompts.builder import extract_xml_tag

logger = logging.getLogger(__name__)

# ============================================================================ #
#  1. WORKFLOW STATE MANAGER & STATUS TRACKING
# ============================================================================ #

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"

class ExecutionState:
    """Manages the status of tasks in an execution workflow."""
    def __init__(self):
        self._state: dict[str, TaskStatus] = {}
        self._results: dict[str, Any] = {}

    def update_status(self, task_id: str, status: TaskStatus):
        self._state[task_id] = status
        logger.info(f"Task '{task_id}' status updated to {status.value}")

    def get_status(self, task_id: str) -> TaskStatus:
        return self._state.get(task_id, TaskStatus.PENDING)

    def save_result(self, task_id: str, result: Any):
        self._results[task_id] = result
        self.update_status(task_id, TaskStatus.COMPLETED)


# ============================================================================ #
#  2. MODULAR TASK EXECUTION & API INTEGRATIONS
# ============================================================================ #

class MockAPITools:
    """Simulated API triggers requested by the user."""
    
    @staticmethod
    async def send_email(to: str, subject: str, body: str) -> str:
        logger.info(f"Connecting to SMTP... Sending email to {to}")
        await asyncio.sleep(0.5) # Simulate network delay
        return f"Email sent successfully to {to}."

    @staticmethod
    async def trigger_api(endpoint: str, payload: dict) -> dict:
        logger.info(f"POST {endpoint} with payload {payload}")
        await asyncio.sleep(0.5) # Simulate network delay
        return {"status": 200, "message": "API triggered successfully"}

    @staticmethod
    async def schedule_reminder(user_id: str, message: str, delay_seconds: int) -> str:
        logger.info(f"Scheduled reminder for user {user_id} in {delay_seconds} seconds.")
        # In a real app, this would push to a Redis/Celery queue.
        return f"Reminder scheduled for user {user_id}."


# ============================================================================ #
#  3. TASK EXECUTION ENGINE & ERROR RECOVERY
# ============================================================================ #

class ExecutionAgent(BaseAgent):
    """
    Executes specific atomic tasks dynamically, tracking states and 
    implementing robust retry mechanics.
    """

    def __init__(self):
        super().__init__(name="execution-agent", role="Workflow Executor")
        self.state_manager = ExecutionState()
        self._llm = get_llm_provider()
        
        # Registry mapping task commands to async functions
        self._tools: dict[str, Callable[..., Awaitable[Any]]] = {
            "send_email": MockAPITools.send_email,
            "trigger_api": MockAPITools.trigger_api,
            "schedule_reminder": MockAPITools.schedule_reminder,
        }

    async def _execute_with_retry(
        self, 
        task_id: str, 
        func: Callable[..., Awaitable[Any]], 
        kwargs: dict[str, Any], 
        max_retries: int = 3
    ) -> Any:
        """Error recovery logic using exponential backoff."""
        for attempt in range(max_retries):
            try:
                self.state_manager.update_status(task_id, TaskStatus.IN_PROGRESS)
                result = await func(**kwargs)
                self.state_manager.save_result(task_id, result)
                return result
            except Exception as exc:
                logger.error(f"Task '{task_id}' failed (attempt {attempt + 1}): {exc}")
                
                if attempt < max_retries - 1:
                    self.state_manager.update_status(task_id, TaskStatus.RETRYING)
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    self.state_manager.update_status(task_id, TaskStatus.FAILED)
                    raise RuntimeError(f"Task '{task_id}' failed after {max_retries} attempts.") from exc

    async def execute(self, task: str, task_id: str | None = None) -> str:
        task_id = task_id or "default"
        
        # Extract raw task from XML if present
        raw_task = extract_xml_tag(task, "raw_input") or task
        
        if raw_task.upper().startswith("TOOL:"):
            parts = raw_task[5:].strip().split(":", 1)
            command = parts[0].strip()
            kwargs = {}
            if len(parts) > 1:
                import json
                try:
                    kwargs = json.loads(parts[1])
                except json.JSONDecodeError:
                    pass
            return str(await self.execute_task(task_id, command, **kwargs))
        
        # Workflow: email_drafting
        sub_intent = extract_xml_tag(task, "sub_intent")
        if sub_intent == "email_drafting" or "draft" in raw_task.lower():
            return await self._draft_email(task)
            
        return f"Executed: {raw_task}"

    async def _draft_email(self, enriched_task: str) -> str:
        """
        AI-powered email drafting with context awareness.
        """
        logger.info("Generating professional email draft via LLM...")
        
        meeting_notes = extract_xml_tag(enriched_task, "meeting_notes") or "No notes provided."
        user_intent = extract_xml_tag(enriched_task, "raw_input") or "Draft a follow-up email."
        episodic_memory = extract_xml_tag(enriched_task, "episodic") or "No prior context."
        tone = extract_xml_tag(enriched_task, "tone") or "Professional"

        # Hydrate system prompt
        system_prompt = EMAIL_DRAFTING_SYSTEM_PROMPT.replace("{{meeting_notes}}", meeting_notes) \
                                                    .replace("{{user_intent}}", user_intent) \
                                                    .replace("{{episodic_memory}}", episodic_memory) \
                                                    .replace("{{tone}}", tone)

        try:
            response = await self._llm.generate(
                prompt=EMAIL_DRAFTING_USER_PROMPT,
                system=system_prompt,
                temperature=0.3 # Precision over creativity
            )
            return response
        except Exception as e:
            logger.error(f"Email drafting failed: {e}")
            return f"Error generating draft: {str(e)}"

    async def execute_task(self, task_id: str, command: str, **kwargs) -> Any:
        """
        Main entry point for executing a single workflow task.
        """
        logger.info(f"\n--- Starting Task: {task_id} ({command}) ---")
        
        if command not in self._tools:
            self.state_manager.update_status(task_id, TaskStatus.FAILED)
            return f"Error: Command '{command}' not recognized."

        func = self._tools[command]
        
        try:
            result = await self._execute_with_retry(task_id, func, kwargs)
            logger.info(f"Result: {result}")
            return result
        except Exception as e:
            logger.error(f"Execution Engine aborted {task_id}: {e}")
            return str(e)


# ============================================================================ #
#  4. EXAMPLE WORKFLOWS
# ============================================================================ #

async def example_usage():
    import sys
    logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(levelname)s: %(message)s")
    
    print("\n=== Initializing Execution Agent ===")
    agent = ExecutionAgent()

    # Define a workflow graph of tasks to execute
    workflow = [
        {
            "task_id": "task_1",
            "command": "trigger_api",
            "kwargs": {"endpoint": "https://api.cognitive.os/v1/analyze", "payload": {"data": "user_report"}}
        },
        {
            "task_id": "task_2",
            "command": "send_email",
            "kwargs": {"to": "team@cognitive.os", "subject": "Analysis Ready", "body": "The report is attached."}
        },
        {
            "task_id": "task_3",
            "command": "schedule_reminder",
            "kwargs": {"user_id": "U12345", "message": "Follow up on analysis report", "delay_seconds": 86400}
        }
    ]

    print("\n=== Executing Async Workflow ===")
    
    # We can execute these sequentially or concurrently. 
    # For a dependent workflow, sequential is safer:
    for step in workflow:
        await agent.execute_task(
            task_id=step["task_id"], 
            command=step["command"], 
            **step["kwargs"]
        )

    print("\n=== Workflow State Dump ===")
    for task_id, status in agent.state_manager._state.items():
        print(f"[{task_id}]: {status.value}")

if __name__ == "__main__":
    asyncio.run(example_usage())
