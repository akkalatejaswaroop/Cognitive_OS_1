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
You are the Cognitive OS Intelligence Router. Your mission is to map user intent 
to the most efficient specialized workflow.

### WORKFLOW REGISTRY:
1. meeting_summary: Distilling meetings, identifying participants and action items.
2. email_drafting: Creating professional outreach, replies, or internal comms.
3. reminder_generation: Temporal tasks, deadline prediction, and alerts.
4. research_assistant: Web search, code analysis, deep dives into topics.
5. productivity_optimization: Analyzing user habits or goal alignment.
6. memory_retrieval: Searching past interactions or history.
7. general_query: Fallback for unclassified requests.

### OUTPUT FORMAT (JSON):
{
  "intent_id": "string_slug",
  "workflow": "key_from_registry",
  "confidence": 0.0-1.0,
  "requires_memory": true/false,
  "reasoning": "one-sentence technical justification",
  "priority": 1-5
}
"""

class AIWorkflowRouter:
    def __init__(self):
        self._llm = get_llm_provider()

    async def route(self, task: str) -> WorkflowRoute:
        """
        Classifies intent and returns a structured route.
        Decision Tree: Heuristics -> Semantic (LLM) -> Confidence Check -> Fallback.
        """
        # 1. Tier 1: Heuristics (Fast-Path)
        h_type = heuristic_classify(task)
        if h_type:
            logger.info(f"Router: Tier 1 Hit (Heuristic) -> {h_type}")
            return WorkflowRoute(
                intent="Heuristic match",
                workflow_type=h_type,
                primary_agent=AGENT_MAPPING.get(h_type),
                priority=3
            )

        # 2. Tier 2: Semantic Classification
        try:
            raw_response = await self._llm.generate(
                prompt=task,
                system=ROUTER_SYSTEM_PROMPT,
                temperature=0.0
            )
            
            data = self._parse_json(raw_response)
            confidence = data.get("confidence", 0.0)
            w_key = data.get("workflow", "general_query")
            
            # Tier 3: Confidence Check
            if confidence < 0.7:
                logger.warning(f"Router: Low confidence ({confidence}) for '{w_key}'. Scaling to refinement.")
                w_key = "general_query"

            w_type = WorkflowType(w_key)
            
            return WorkflowRoute(
                intent=data.get("intent_id", "Unknown intent"),
                workflow_type=w_type,
                primary_agent=AGENT_MAPPING.get(w_type),
                memory_query=task if data.get("requires_memory") else None,
                priority=data.get("priority", 3)
            )
            
        except Exception as e:
            logger.error(f"Router Tier 2 Failed: {e}")
            # Tier 4: Terminal Fallback
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
