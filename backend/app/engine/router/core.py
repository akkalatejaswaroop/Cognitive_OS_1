"""
AI Workflow Router Core Logic.
Handles intent classification and agent dispatching.
"""
import logging
import json
from typing import Dict, Any, Optional
from app.llm.factory import get_llm_provider
from app.engine.router.schema import WorkflowRoute, WorkflowType, AGENT_MAPPING
from app.engine.router.heuristics import heuristic_classify

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = """
You are the Cognitive OS Workflow Router. Your job is to analyze user input and 
route it to the correct specialized workflow and agent.

Available Workflows:
- meeting_summary: For distilling transcripts or meeting notes.
- email_drafting: For writing, replying, or editing emails.
- reminder_generation: For setting alerts, tasks, or follow-ups.
- research_assistant: For deep dives, fact-checking, or topic analysis.
- productivity_analytics: For reviewing usage patterns or goals.
- memory_retrieval: For asking "what did I say" or "remember when."
- calendar_planning: For scheduling, checking availability, or event planning.
- document_summarization: For condensing large files or articles.
- general_query: For everything else.

Output EXACTLY JSON in this format:
{
  "intent": "brief explanation",
  "workflow_type": "one of the above keys",
  "memory_query": "search query for RAG (optional)",
  "priority": 1-5
}
"""

class AIWorkflowRouter:
    def __init__(self):
        self._llm = get_llm_provider()

    async def route(self, task: str) -> WorkflowRoute:
        """
        Classifies intent and returns a structured route.
        Uses heuristics first for performance, then LLM.
        """
        # 1. Fast Path (Heuristics)
        h_type = heuristic_classify(task)
        if h_type:
            logger.info(f"Router: Fast-path hit -> {h_type}")
            return WorkflowRoute(
                intent="Heuristic match",
                workflow_type=h_type,
                primary_agent=AGENT_MAPPING.get(h_type),
                priority=3
            )

        # 2. Semantic Path (LLM)
        try:
            raw_response = await self._llm.generate(
                prompt=task,
                system=ROUTER_SYSTEM_PROMPT,
                temperature=0.0
            )
            
            # Clean and parse JSON
            data = self._parse_json(raw_response)
            
            w_type = WorkflowType(data.get("workflow_type", "general_query"))
            
            return WorkflowRoute(
                intent=data.get("intent", "Unknown intent"),
                workflow_type=w_type,
                primary_agent=AGENT_MAPPING.get(w_type),
                memory_query=data.get("memory_query"),
                priority=data.get("priority", 3)
            )
            
        except Exception as e:
            logger.error(f"Router failed: {e}")
            # Fallback
            return WorkflowRoute(
                intent="Fallback due to error",
                workflow_type=WorkflowType.GENERAL_QUERY,
                primary_agent=AGENT_MAPPING[WorkflowType.GENERAL_QUERY]
            )

    def _parse_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text)
