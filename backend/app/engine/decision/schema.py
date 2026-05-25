from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field

class ImpactLevel(int, Enum):
    LOW = 1
    MEDIUM = 3
    HIGH = 5
    CRITICAL = 10

class UrgencyLevel(int, Enum):
    TRIVIAL = 1
    ROUTINE = 3
    URGENT = 5
    IMMEDIATE = 10

class PriorityScore(BaseModel):
    impact: ImpactLevel
    urgency: UrgencyLevel
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    
    @property
    def total_score(self) -> float:
        # Priority = (Impact * Urgency) * Confidence
        return (self.impact.value * self.urgency.value) * self.confidence

class DecisionNode(BaseModel):
    action_id: str
    description: str
    agent_target: str
    priority: PriorityScore
    reasoning: str
    predicted_next_actions: List[str] = []

class DecisionPackage(BaseModel):
    selected_action: DecisionNode
    alternative_actions: List[DecisionNode] = []
    context_confidence: float
    reasoning_chain: List[str]
    metadata: Dict[str, Any] = {}
