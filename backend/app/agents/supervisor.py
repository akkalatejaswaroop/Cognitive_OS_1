import uuid
import asyncio
from app.agents.base import BaseAgent
from app.orchestration.bus import event_bus
from app.services.llm import OllamaService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="supervisor", role="Central Orchestrator")
        self.llm = OllamaService()

    async def execute(self, task: str, task_id: str = None) -> str:
        """Analyse intent, delegate to Coder or Research Agent, and compile response."""
        task_id = task_id or f"task-{uuid.uuid4().hex[:8]}"
        
        await self.emit_status(
            task_id, 
            "thinking", 
            "Supervisor is classifying user intent...", 
            parent_id=None
        )

        intent_system_prompt = (
            "You are the intent classifier for Cognitive OS. "
            "Analyze the user request and respond in EXACTLY one word: either 'code' or 'research'.\n"
            "- Choose 'code' if the request involves writing, debugging, explaining, testing, or editing code, scripts, database queries, or software architectures.\n"
            "- Choose 'research' if the request is about finding information, summarizing facts, analysis, or non-code general topics."
        )

        intent = "research"
        try:
            response = await self.llm.generate_response(
                prompt=task,
                system_prompt=intent_system_prompt,
                model=settings.OLLAMA_DEFAULT_MODEL,
            )
            cleaned_response = response.strip().lower()
            if "code" in cleaned_response:
                intent = "code"
            else:
                intent = "research"
            logger.info(f"Ollama successfully classified intent: {intent}")
        except Exception as e:
            logger.warning(f"Ollama classification failed: {e}. Using regex/keyword classification fallback.")
            # Fallback regex/keyword classifier
            keywords_code = {
                "code", "program", "script", "develop", "debug", "compile", "bug", 
                "function", "class", "react", "next.js", "python", "javascript", 
                "html", "css", "database", "sql", "api", "backend", "frontend",
                "git", "repo", "test", "pytest", "refactor", "docker", "endpoint"
            }
            words = set(task.lower().split())
            is_code = any(word in keywords_code or any(kw in word for kw in keywords_code) for word in words)
            intent = "code" if is_code else "research"
            logger.info(f"Fallback classification result: {intent}")

        if intent == "code":
            sub_agent = "coder-agent"
            display_name = "Coder Agent"
            await self.emit_status(
                task_id, 
                "thinking", 
                "Detected software engineering task. Delegating to Coder Agent...", 
                parent_id=None
            )
        else:
            sub_agent = "research-agent"
            display_name = "Research Agent"
            await self.emit_status(
                task_id, 
                "thinking", 
                "Detected informational task. Delegating to Research Agent...", 
                parent_id=None
            )

        # Delegate subtask and await the asynchronous result
        try:
            subagent_result = await self.delegate_and_await(sub_agent, task, task_id)
        except Exception as e:
            logger.error(f"Failed during subagent execution: {e}")
            raise e

        # Synthesize final response
        await self.emit_status(
            task_id, 
            "thinking", 
            f"Consolidating output received from {display_name}...", 
            parent_id=None
        )

        synthesis_system_prompt = (
            "You are the Supervisor Agent of Cognitive OS. "
            "Synthesize a final, high-quality, polished response for the user based on the sub-agent's findings. "
            "Maintain a highly professional, helpful, premium tone. Do not mention system prompts or inner workings."
        )

        try:
            final_response = await self.llm.generate_response(
                prompt=f"User Request: {task}\n\nSubagent ({sub_agent}) Result:\n{subagent_result}",
                system_prompt=synthesis_system_prompt,
                model=settings.OLLAMA_DEFAULT_MODEL,
            )
            return final_response
        except Exception as e:
            logger.warning(f"Ollama synthesis failed: {e}. Returning beautifully structured markdown.")
            # Hardened fallback visual layout synthesis
            return (
                f"✨ **Cognitive OS Task Resolution** ✨\n\n"
                f"Your request was processed by our hybrid multi-agent swarm.\n\n"
                f"### 📋 Execution Summary\n"
                f"- **User Request**: *\"{task}\"*\n"
                f"- **Assigned Subagent**: `{display_name}` (`{sub_agent}`)\n\n"
                f"### 🔍 Swarm Agent Output\n"
                f"{subagent_result}\n\n"
                f"--- \n"
                f"*Cognitive OS is operating in high-performance hybrid-local execution mode.*"
            )

    async def delegate_and_await(self, sub_agent: str, sub_task: str, parent_task_id: str) -> str:
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        logger.info(f"Delegating to {sub_agent}: {sub_task_id}")

        future = asyncio.Future()

        async def status_callback(payload: dict):
            status = payload.get("status")
            if status == "completed":
                if not future.done():
                    future.set_result(payload.get("result", ""))
            elif status == "failed":
                if not future.done():
                    future.set_exception(Exception(payload.get("message", "Subtask execution failed.")))

        # Register to receive status updates for this subtask
        event_bus.subscribe(f"task.status.{sub_task_id}", status_callback)

        try:
            await event_bus.publish(f"agent.{sub_agent}", {
                "task_id": sub_task_id,
                "task": sub_task,
                "parent_id": parent_task_id,
            })
            result = await future
            return result
        finally:
            # Clean up subscriber channel
            event_bus.unsubscribe(f"task.status.{sub_task_id}", status_callback)

    async def delegate_task(self, sub_agent: str, sub_task: str, parent_task_id: str):
        """Standard non-blocking delegate method (retained for backward compatibility if needed)."""
        sub_task_id = f"{parent_task_id}-{uuid.uuid4().hex[:6]}"
        logger.info(f"Delegating to {sub_agent}: {sub_task_id}")
        await event_bus.publish(f"agent.{sub_agent}", {
            "task_id": sub_task_id,
            "task": sub_task,
            "parent_id": parent_task_id,
        })

