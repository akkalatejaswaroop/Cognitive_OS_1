from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

class GroundingSource(str, Enum):
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    WEB = "web"
    USER_PROFILE = "user_profile"
    GENERAL_KNOWLEDGE = "general_knowledge"

class FactualClaim(BaseModel):
    claim: str
    source_id: Optional[str]
    source_type: GroundingSource
    confidence: float = Field(ge=0.0, le=1.0)
    is_grounded: bool = False

class SafetyReport(BaseModel):
    is_safe: bool
    confidence_score: float
    hallucination_risk: float
    ungrounded_claims: List[str] = []
    recommended_action: str # "PASS" | "QUALIFY" | "BLOCK"
    safe_fallback_response: Optional[str] = None
