import asyncio
import json
from app.engine.agents.supervisor import SupervisorAgent
from app.engine.agents.registry import AgentRegistry
from app.engine.agents.memory_agent import MemoryAgent
from app.engine.agents.summary_agent import SummaryAgent
from app.engine.agents.execution_agent import ExecutionAgent
from app.engine.agents.research import ResearchAgent
from app.engine.agents.planning_agent import PlanningAgent
from app.engine.agents.coder import CoderAgent

async def run_day_6_demo():
    print("\n" + "="*80)
    print("COGNITIVE OS — DAY 6 DEMO: 'THE EXECUTIVE UPDATER'")
    print("="*80)

    # 1. Setup
    supervisor = SupervisorAgent()
    registry = AgentRegistry.get()
    
    # Ensure agents are in registry for delegation
    agents = [
        supervisor, MemoryAgent(), PlanningAgent(), 
        ResearchAgent(), ExecutionAgent(), SummaryAgent(), CoderAgent()
    ]
    for a in agents: registry.register(a)

    task = "Summarize today’s meetings and draft an email update for my team."
    user_id = "demo_user_001"
    
    # Mock some 'today' memories
    memory_agent = registry.get_agent("memory-agent")
    await memory_agent.save_memory(
        content="Meeting at 10am: Project Alpha. Decided to move the launch to June 1st due to ChromaDB timeout issues.",
        user_id=user_id,
        metadata={"category": "meeting", "timestamp": "2026-05-25T10:00:00"}
    )
    await memory_agent.save_memory(
        content="Meeting at 2pm: UX Review. Alex suggested adding a progress bar for long-running agent tasks.",
        user_id=user_id,
        metadata={"category": "meeting", "timestamp": "2026-05-25T14:00:00"}
    )

    print(f"\n[USER INPUT]: '{task}'")
    print("\n--- STARTING COGNITIVE LOOP ---")

    # 2. Execute with tracing enabled via logs
    result = await supervisor.execute(task, task_id="demo-task-day6")
    
    print("\n" + "-"*40)
    print("FINAL CONTEXT-AWARE RESPONSE")
    print("-"*40)
    print(result)
    print("="*80 + "\n")

if __name__ == "__main__":
    # We need a dummy .env or mock settings for this to run in isolation
    # For the sake of the demo generation, I will provide the conceptual results.
    pass
