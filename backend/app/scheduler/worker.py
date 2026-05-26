"""
Temporal Scheduler for Cognitive OS.
Polls the `scheduled_tasks` table and triggers workflows.
"""
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.database import SessionLocal
from app.engine.memory.context.automation_models import ScheduledTask
from app.engine.automation.executor import EnhancedWorkflowExecutor

logger = logging.getLogger("automation_scheduler")

class AutomationScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    async def poll_tasks(self):
        """
        Check for tasks that are enabled and ready to run.
        """
        now = datetime.now(timezone.utc)
        logger.debug(f"Polling scheduled tasks at {now}")
        
        with SessionLocal() as db:
            # Find tasks where next_run_at is in the past
            tasks = db.query(ScheduledTask).filter(
                ScheduledTask.is_enabled == True,
                ScheduledTask.next_run_at <= now
            ).all()
            
            for task in tasks:
                logger.info(f"Triggering scheduled task: {task.id} (Automation: {task.automation_id})")
                
                # 1. Create a WorkflowHistory record (Execution)
                from app.engine.memory.context.automation_models import WorkflowHistory
                execution = WorkflowHistory(
                    automation_id=task.automation_id,
                    user_id=task.user_id,
                    input_payload={"trigger": "scheduled_task", "task_id": str(task.id)},
                    status="pending"
                )
                db.add(execution)
                db.commit()
                db.refresh(execution)

                # 2. Hand off to Executor
                executor = EnhancedWorkflowExecutor(execution.id)
                import asyncio
                asyncio.create_task(executor.run())

                # 3. Update task last_run and calculate next_run (simplistic)
                task.last_run_at = now
                # For this demo, we just disable it or bump it by 24h if it's a daily task
                # In a real app, parse the cron expression
                if task.schedule_expression:
                    # Logic to calculate next run based on cron would go here
                    # For now, let's just push it forward 24h as a placeholder
                    from datetime import timedelta
                    task.next_run_at = now + timedelta(days=1)
                else:
                    task.is_enabled = False # Run once
                
                db.commit()

    def start(self):
        # Poll every 60 seconds
        self.scheduler.add_job(self.poll_tasks, 'interval', seconds=60)
        self.scheduler.start()
        logger.info("Automation Scheduler started (Polling every 60s).")

    def shutdown(self):
        self.scheduler.shutdown()
        logger.info("Automation Scheduler stopped.")

# Global instance
automation_scheduler = AutomationScheduler()
