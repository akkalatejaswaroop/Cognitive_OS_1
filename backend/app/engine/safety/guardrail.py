"""
Hallucination Prevention Guardrail Core.
Implements the N-pass fact verification and confidence scoring.
"""
import logging
import json
import re
from typing import List, Dict, Any
from app.llm.factory import get_llm_provider
from app.engine.safety.schema import SafetyReport, FactualClaim, GroundingSource

logger = logging.getLogger(__name__)

VERIFICATION_SYSTEM_PROMPT = """
You are the Cognitive OS Fact-Verifier. Your mission is to cross-check an AI 
generated response against provided context blocks.

Verification Protocol:
1. EXTRACT: Identify all factual claims in the response (dates, names, actions, facts).
2. TRACE: Find direct support for each claim in the context.
3. CATEGORIZE: 
   - Grounded: Claim is explicitly supported.
   - Fabricated: Claim contradicts context or is not mentioned.
   - Uncertain: Context is vague but claim is plausible.

Output EXACTLY JSON:
{
  "claims": [
    {
      "claim": "text",
      "source_id": "id",
      "is_grounded": true|false,
      "confidence": 0.X
    }
  ],
  "overall_confidence": 0.X
}
"""

class HallucinationGuardrail:
    def __init__(self):
        self._llm = get_llm_provider()
        self.threshold_block = 0.4
        self.threshold_qualify = 0.7

    async def validate_output(self, 
                               response: str, 
                               context: str) -> SafetyReport:
        """
        Validates AI output using an N-pass verification loop.
        """
        try:
            # Pass 1: Fact Extraction & Tracing
            verification_data = await self._verify_claims(response, context)
            
            avg_confidence = verification_data.get("overall_confidence", 0.0)
            ungrounded = [c["claim"] for c in verification_data.get("claims", []) if not c["is_grounded"]]
            
            risk = len(ungrounded) / len(verification_data["claims"]) if verification_data["claims"] else 0
            
            # Determine Action
            action = "PASS"
            fallback = None
            
            if avg_confidence < self.threshold_block or risk > 0.5:
                action = "BLOCK"
                fallback = "I'm sorry, but I couldn't verify the facts required for this response. Would you like me to try a different research path?"
            elif avg_confidence < self.threshold_qualify:
                action = "QUALIFY"
                response = f"[UNCERTAIN] {response}"

            return SafetyReport(
                is_safe=(action != "BLOCK"),
                confidence_score=avg_confidence,
                hallucination_risk=risk,
                ungrounded_claims=ungrounded,
                recommended_action=action,
                safe_fallback_response=fallback
            )
            
        except Exception as e:
            logger.error(f"Hallucination Guardrail failed: {e}")
            return SafetyReport(
                is_safe=False,
                confidence_score=0.0,
                hallucination_risk=1.0,
                recommended_action="BLOCK",
                safe_fallback_response="An internal safety verification error occurred."
            )

    async def _verify_claims(self, response: str, context: str) -> Dict[str, Any]:
        payload = f"RESPONSE TO VERIFY:\n{response}\n\nGROUNDING CONTEXT:\n{context}"
        
        raw_verification = await self._llm.generate(
            prompt=payload,
            system=VERIFICATION_SYSTEM_PROMPT,
            temperature=0.0
        )
        return self._parse_json(raw_verification)

    def _parse_json(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text)
