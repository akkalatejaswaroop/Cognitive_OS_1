import pytest
from app.engine.safety.guardrail import HallucinationGuardrail

@pytest.mark.asyncio
async def test_hallucination_detection_positive():
    guardrail = HallucinationGuardrail()
    
    # Context explicitly states date is May 25, 2026
    context = "Pinned Fact: The project launch date is May 25, 2026."
    
    # Response incorrectly states May 28
    hallucinated_response = "The project will launch on May 28, 2026."
    
    report = await guardrail.validate_output(hallucinated_response, context)
    
    # Should detect ungrounded/incorrect claim
    assert report.is_safe is False or report.recommended_action == "BLOCK"
    assert "May 28" in report.ungrounded_claims[0]

@pytest.mark.asyncio
async def test_hallucination_detection_negative():
    guardrail = HallucinationGuardrail()
    
    context = "User Alex is a Python developer. He prefers dark mode."
    valid_response = "Alex is a developer who uses Python and likes dark mode."
    
    report = await guardrail.validate_output(valid_response, context)
    
    assert report.is_safe is True
    assert report.confidence_score > 0.8
    assert len(report.ungrounded_claims) == 0
