"""
Planning Agent for Cognitive OS
Converts high-level user goals into structured, executable SubTask graphs.
Uses OpenAI Function Calling (Structured Outputs) to guarantee the JSON schema.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from typing import Any

from pydantic import BaseModel, Field

# Assuming OpenAI SDK is installed.
# To install: pip install openai
from openai import AsyncOpenAI

from app.agents.base import BaseAgent
from app.schemas.agent import TaskGraph, SubTask

logger = logging.getLogger(__name__)

# ============================================================================ #
#  PLANNER SCHEMA (Pydantic models for OpenAI Structured Outputs)
# ============================================================================ #

class SubTaskDef(BaseModel):
    """Schema for a single step in the generated plan."""
    step_id: int = Field(
        ..., 
        description="A unique integer ID for this step, starting from 1."
    )
    description: str = Field(
        ..., 
        description="Detailed description of what the agent needs to do."
    )
    agent: str = Field(
        ..., 
        description="The assigned agent: 'research', 'execution', 'memory', or 'summary'."
    )
    depends_on: list[int] = Field(
        default_factory=list,
        description="List of step_ids that must complete before this step can begin."
    )

class WorkflowPlan(BaseModel):
    """The full workflow dependency graph returned by OpenAI."""
    plan_objective: str = Field(
        ..., 
        description="A brief summary of what this plan aims to achieve."
    )
    subtasks: list[SubTaskDef] = Field(
        ..., 
        description="The ordered list of subtasks."
    )


# ============================================================================ #
#  PLANNING AGENT
# ============================================================================ #

class PlanningAgent(BaseAgent):
    """
    Decomposes user goals into a step-by-step executable workflow.
    Uses OpenAI's 'response_format' tool to enforce the WorkflowPlan schema.
    Falls back gracefully when OpenAI is unavailable.
    """

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o-mini"):
        super().__init__(name="planning-agent", role="Strategic Planner")
        self._api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._model = model
        self._client: AsyncOpenAI | None = None

    def _ensure_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not self._api_key:
                raise RuntimeError(
                    "PlanningAgent requires OPENAI_API_KEY. "
                    "Set it in your .env file or environment variables."
                )
            self._client = AsyncOpenAI(api_key=self._api_key)
        return self._client

    async def execute(self, task: str, task_id: str | None = None) -> str:
        tid = task_id or str(uuid.uuid4())
        plan = await self.generate_plan(task)
        if plan is None:
            return TaskGraph(task_id=tid, subtasks=[]).model_dump_json()

        # Convert WorkflowPlan (OpenAI schema) to TaskGraph (OS canonical schema)
        subtasks = []
        # Create a mapping from integer step_id to a stable UUID string
        id_map = {st.step_id: f"{tid}-{st.step_id}" for st in plan.subtasks}
        
        agent_map = {
            "research": "research-agent",
            "execution": "execution-agent",
            "memory": "memory-agent",
            "summary": "summary-agent"
        }

        for st in plan.subtasks:
            subtasks.append(SubTask(
                sub_task_id=id_map[st.step_id],
                parent_task_id=tid,
                agent=agent_map.get(st.agent.lower(), "research-agent"),
                description=st.description,
                depends_on=[id_map[d] for d in st.depends_on if d in id_map],
                status="pending"
            ))

        graph = TaskGraph(task_id=tid, subtasks=subtasks)
        return graph.model_dump_json()

    async def generate_plan(
        self, 
        user_goal: str, 
        max_retries: int = 3
    ) -> WorkflowPlan | None:
        """
        Calls OpenAI to decompose the user goal into a WorkflowPlan.
        Includes exponential backoff retry logic.
        """
        system_prompt = (
            "You are the Strategic Planner for Cognitive OS. Your job is to convert "
            "high-level user goals into a step-by-step executable workflow graph.\n"
            "Assign tasks to one of these agents: 'research', 'execution', 'memory', or 'summary'.\n"
            "Ensure that tasks are logically ordered and use the `depends_on` array to map dependencies."
        )

        for attempt in range(max_retries):
            try:
                client = self._ensure_client()
                logger.info(f"Generating plan for goal (attempt {attempt + 1})...")
                
                response = await client.beta.chat.completions.parse(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_goal},
                    ],
                    response_format=WorkflowPlan,
                    temperature=0.2, # Low temp for consistency
                )
                
                # Extract the parsed Pydantic object
                plan = response.choices[0].message.parsed
                logger.info(f"Successfully generated plan with {len(plan.subtasks)} steps.")
                return plan

            except Exception as exc:
                logger.warning(f"Plan generation failed on attempt {attempt + 1}: {exc}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt) # Exponential backoff
                else:
                    logger.error("Max retries exceeded for PlanningAgent.")
                    return None


# ============================================================================ #
#  EXAMPLE EXECUTION PIPELINE
# ============================================================================ #

async def example_usage():
    import sys
    import os
    
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    
    # Needs OPENAI_API_KEY in the environment
    if not os.getenv("OPENAI_API_KEY"):
        print("\n[WARNING] OPENAI_API_KEY is not set. OpenAI API call will fail.")
        print("Set it in your terminal or .env file before running.")
        return

    print("\n=== Initializing Planning Agent ===")
    planner = PlanningAgent()
    
    user_input = "Prepare meeting summary and send to team"
    print(f"\nUser Input: '{user_input}'\n")

    # Generate the Plan
    plan = await planner.generate_plan(user_input)
    
    if not plan:
        print("Failed to generate plan.")
        return

    # Output the structured response
    print("=== Expected Plan Generated ===")
    print(f"Objective: {plan.plan_objective}\n")
    
    for step in plan.subtasks:
        deps = f" (Depends on: {step.depends_on})" if step.depends_on else ""
        print(f"{step.step_id}. [{step.agent.upper()}] {step.description}{deps}")
        
    print("\n=== Example API Response (JSON) ===")
    print(plan.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(example_usage())
