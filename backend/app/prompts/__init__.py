"""
Prompts package — centralises all system prompts for the 6-agent system.
Importing from here keeps agent files clean and prompts easy to iterate on.
"""
from app.prompts.orchestrator import ORCHESTRATOR_INTENT, ORCHESTRATOR_SYNTHESIS
from app.prompts.memory import MEMORY_CONSOLIDATION, MEMORY_RECALL_CTX
from app.prompts.planning import PLANNING_DECOMPOSE
from app.prompts.research import RESEARCH_ANALYST
from app.prompts.execution import EXECUTION_ENGINEER
from app.prompts.summary import SUMMARY_DISTILL

__all__ = [
    "ORCHESTRATOR_INTENT",
    "ORCHESTRATOR_SYNTHESIS",
    "MEMORY_CONSOLIDATION",
    "MEMORY_RECALL_CTX",
    "PLANNING_DECOMPOSE",
    "RESEARCH_ANALYST",
    "EXECUTION_ENGINEER",
    "SUMMARY_DISTILL",
]
