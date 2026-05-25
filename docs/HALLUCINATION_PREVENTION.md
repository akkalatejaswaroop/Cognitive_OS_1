# Cognitive OS — Hallucination Prevention Framework

## 1. Hallucination Detection Methods
The framework uses an **N-Pass Verification Loop**:
- **Pass 1 (Extraction):** Identifies factual claims (entities, dates, metrics, actions).
- **Pass 2 (Grounding):** Cross-references each claim against the specific `source_id` in memory or RAG.
- **Pass 3 (Contradiction Check):** Detects if a claim explicitly violates a pinned user fact or recent decision.

## 2. Confidence Scoring Logic
Confidence is calculated as a weighted average:
- **Semantic Overlap (40%):** How closely the generated prose matches source text.
- **Source Density (30%):** Ratio of supported claims to total claims.
- **Temporal Relevance (20%):** Is the source context recent?
- **Agent Self-Assessment (10%):** The LLM's own uncertainty markers.

## 3. Retrieval Validation System
Every memory chunk retrieved undergoes a **Relevance Filter**:
- **Discard** chunks with similarity < 0.65.
- **Rank** remaining chunks by `recency` and `authoritativeness`.
- **Deduplicate** overlapping information to prevent "repetition hallucinations."

## 4. Fact Verification Architecture
Implemented as a separate `HallucinationGuardrail` module that runs as a "judge" over the specialist agent's output. This prevents the "execution agent" from validating its own work, ensuring objectivity.

## 5. Memory Grounding Workflow
1. **Request:** User asks a question.
2. **Recall:** Memory Agent fetches chunks.
3. **Reason:** Specialist Agent generates a grounded draft.
4. **Verify:** Guardrail checks the draft against chunks.
5. **Score:** If score > threshold, proceed. Else, fallback.

## 6. Safe Fallback Responses
- **Uncertain Path:** "[UNCERTAIN] I believe X is true based on Y, but I couldn't find a direct record of Z."
- **Block Path:** "I'm sorry, I couldn't verify the facts required for a reliable answer. Would you like to check [Source Reference] or rephrase?"

## 7. Prompt Constraints
- **Absolute Rule:** "Every factual claim MUST be traceable to a Source ID."
- **Positional Rule:** Safety constraints are placed at the end of the prompt for highest attention weighting.

## 8. Context Verification
Before generation, the `Supervisor` verifies if the `context_window` has enough token budget for grounding. If not, it triggers **Context Compression** to preserve only critical facts.

## 9. AI Output Filtering
- **Fabricated Action Filter:** Blocks commands to external APIs if the specific entity/parameter isn't present in the context.
- **PII Filter:** Redacts sensitive data that wasn't explicitly authorized for the current workflow.

## 10. Production Implementation Strategy
- **Stage 1 (Async):** Log safety reports without blocking for baseline analysis.
- **Stage 2 (Qualify):** Add uncertainty markers to low-confidence responses.
- **Stage 3 (Enforce):** Hard-block hallucinations in critical workflows (Email, Calendar).
