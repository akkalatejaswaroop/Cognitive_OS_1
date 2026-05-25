import asyncio
import logging
import os
import time

from app.engine.agents.planning_agent import PlanningAgent
from app.engine.agents.memory_agent import MemoryAgent
from app.engine.agents.research import ResearchAgent
from app.engine.agents.summary_agent import SummaryAgent, SummaryType
from app.engine.agents.execution_agent import ExecutionAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("WorkflowSimulation")

async def run_realtime_simulation():
    """
    End-to-End Realtime Workflow Orchestration:
    1. Planner Agent creates execution steps
    2. Memory Agent retrieves related data
    3. Research Agent gathers additional context
    4. Summary Agent creates summary
    5. Execution Agent drafts and sends email
    6. Memory Agent stores workflow result
    """
    logger.info("Starting Multi-Agent Workflow Simulation...")
    start_time = time.time()
    
    api_key = os.getenv("OPENAI_API_KEY", "dummy-key-to-bypass-init")
    
    # 0. Initialize Agents
    logger.info("Initializing Agents...")
    planner = PlanningAgent(api_key=api_key)
    memory = MemoryAgent(collection_name="cognitive_memory")
    
    # ResearchAgent uses Langchain OpenAIEmbeddings/ChatOpenAI and Tavily, so we set the env vars temporarily
    os.environ["OPENAI_API_KEY"] = api_key
    os.environ["TAVILY_API_KEY"] = os.getenv("TAVILY_API_KEY", "dummy-tavily-key-to-bypass")
    research = ResearchAgent(memory_collection="cognitive_memory")
    
    summary = SummaryAgent(api_key=api_key)
    execution = ExecutionAgent()
    
    # Add a dummy record to memory so it has something to retrieve
    try:
        if not os.getenv("CHROMA_OFFLINE"):
            await memory.save_memory(
                content="Project X is currently 85% complete. We are blocked on the final vector DB integration.",
                user_id="U1", session_id="S1"
            )
    except Exception as e:
        logger.warning(f"Memory store initialization skipped: {e}")

    user_prompt = "Prepare a project update summary and email it to the team."
    logger.info(f"User Request: '{user_prompt}'")
    
    # 1. Planner Agent
    logger.info("--- Step 1: Planning ---")
    plan = await planner.generate_plan(user_prompt, max_retries=1)
    if plan:
        logger.info(f"Plan generated with {len(plan.subtasks)} steps.")
        for step in plan.subtasks:
            logger.info(f" - [{step.agent.upper()}] {step.description}")
    else:
        logger.warning("Planner returned None. (Missing valid OPENAI_API_KEY?) Proceeding with fallback.")
        
    # 2. Memory Agent (Retrieve context)
    logger.info("--- Step 2: Memory Retrieval ---")
    retrieved_memory = await memory.search_context("project update status", user_id="U1", top_k=2, synthesize=False)
    logger.info(f"Memory Context Retrieved: {retrieved_memory}")
    
    # 3. Research Agent (Gather additional context)
    logger.info("--- Step 3: Researching Context ---")
    research_query = "Latest best practices for project update emails"
    research_result = await research.execute_research(research_query, max_retries=1)
    logger.info(f"Research Result: \n{research_result[:150]}...")
    
    # 4. Summary Agent (Create summary)
    logger.info("--- Step 4: Summarization ---")
    raw_content = f"Memory: {retrieved_memory}\n\nResearch: {research_result}"
    structured_summary = await summary.generate_summary(raw_content, SummaryType.WORKFLOW)
    
    final_markdown = "## Summary\nOffline fallback summary"
    if structured_summary:
        final_markdown = summary.format_as_markdown(structured_summary)
        logger.info(f"Structured Summary Generated: {structured_summary.title}")
    else:
        logger.warning("Summary generation returned None. (Missing valid OPENAI_API_KEY?)")
        
    # 5. Execution Agent (Draft and Send Email)
    logger.info("--- Step 5: Execution (Send Email) ---")
    exec_result = await execution.execute_task(
        task_id="email_task_01",
        command="send_email",
        to="team@cognitive.os",
        subject="Project Update Summary",
        body=final_markdown
    )
    logger.info(f"Execution Output: {exec_result}")
    
    # 6. Memory Agent (Store Result)
    logger.info("--- Step 6: Memory Storage ---")
    try:
        await memory.save_memory(
            content=f"Workflow completed: Sent project update email. Summary:\n{final_markdown}",
            user_id="U1",
            session_id="S1"
        )
        logger.info("Workflow result stored in long-term memory.")
    except Exception as e:
        logger.warning(f"Memory storage failed: {e}")

    total_time = time.time() - start_time
    logger.info(f"Workflow Simulation Complete in {total_time:.2f} seconds.")

if __name__ == "__main__":
    asyncio.run(run_realtime_simulation())

