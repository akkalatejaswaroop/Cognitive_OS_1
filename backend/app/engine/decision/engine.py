"""
Cognitive OS Decision Engine Core.
Implements prioritization scoring, reasoning pipelines, and action prediction.
"""
import logging
import json
from typing import List, Dict, Any, Optional
from app.llm.factory import get_llm_provider
from app.engine.decision.schema import (
    DecisionPackage, DecisionNode, PriorityScore, 
    ImpactLevel, UrgencyLevel
)

logger = logging.getLogger(__name__)

DECISION_SYSTEM_PROMPT = """
You are the Cognitive OS Decision Engine. Your mission is to analyze user intent 
within the provided context and determine the optimal next action.

Guidelines:
1. SCORING: Evaluate the IMPACT (1-10) and URGENCY (1-10) of the task.
2. CONFIDENCE: Rate how certain you are based on retrieved memory (0.0-1.0).
3. PREDICTION: Anticipate what the user might need after this action is complete.
4. REASONING: Provide a step-by-step reasoning chain for your choice.

Output EXACTLY JSON:
{
  "selected_action": {
    "action_id": "unique_id",
    "description": "precise task",
    "agent_target": "research-agent | execution-agent | memory-agent | planning-agent | summary-agent",
    "priority": { "impact": 1|3|5|10, "urgency": 1|3|5|10, "confidence": 0.X },
    "reasoning": "why this action",
    "predicted_next_actions": ["action1", "action2"]
  },
  "context_confidence": 0.X,
  "reasoning_chain": ["thought 1", "thought 2"]
}
"""

class DecisionEngine:
    def __init__(self):
        self._llm = get_llm_provider()

    async def evaluate(self, 
                       task: str, 
                       memory_context: str,
                       user_profile: Dict[str, Any]) -> DecisionPackage:
        """
        Runs the AI reasoning pipeline to make an informed decision.
        """
        context_payload = f"""
        USER TASK: {task}
        
        RETRIEVED MEMORY:
        {memory_context}
        
        USER PROFILE:
        {json.dumps(user_profile)}
        """
        
        try:
            raw_response = await self._llm.generate(
                prompt=context_payload,
                system=DECISION_SYSTEM_PROMPT,
                temperature=0.0
            )
            
            data = self._parse_json(raw_response)
            
            # Construct nested Pydantic models
            p_data = data["selected_action"]["priority"]
            priority = PriorityScore(
                impact=ImpactLevel(p_data["impact"]),
                urgency=UrgencyLevel(p_data["urgency"]),
                confidence=p_data["confidence"]
            )
            
            selected_node = DecisionNode(
                action_id=data["selected_action"]["action_id"],
                description=data["selected_action"]["description"],
                agent_target=data["selected_action"]["agent_target"],
                priority=priority,
                reasoning=data["selected_action"]["reasoning"],
                predicted_next_actions=data["selected_action"].get("predicted_next_actions", [])
            )
            
            return DecisionPackage(
                selected_action=selected_node,
                context_confidence=data["context_confidence"],
                reasoning_chain=data["reasoning_chain"]
            )
            
        except Exception as e:
            logger.error(f"Decision Engine failed: {e}")
            # Fallback Decision
            return self._generate_fallback(task)

    def _generate_fallback(self, task: str) -> DecisionPackage:
        return DecisionPackage(
            selected_action=DecisionNode(
                action_id="fallback",
                description=task,
                agent_target="research-agent",
                priority=PriorityScore(impact=ImpactLevel.MEDIUM, urgency=UrgencyLevel.ROUTINE, confidence=0.5),
                reasoning="Fallback due to engine error."
            ),
            context_confidence=0.0,
            reasoning_chain=["Engine failure", "Defaulting to research agent"]
        )

    def _parse_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text)
