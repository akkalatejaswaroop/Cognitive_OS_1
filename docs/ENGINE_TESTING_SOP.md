# Cognitive Engine Testing Checklist

## 1. Prompt Quality Testing
- [ ] Verify XML tags are correctly balanced in generated prompts.
- [ ] Confirm `user_turn` metadata (intent, sub_intent) matches Router output.
- [ ] Check that `safety_constraints` are consistently positioned at the bottom.

## 2. Hallucination Testing
- [ ] **False Fact Insertion:** Does the guardrail block dates not present in context?
- [ ] **Source Binding:** Does every factual claim reference a valid `source_id`?
- [ ] **Contradiction Check:** Does the OS refuse an instruction that violates a `pinned_fact`?

## 3. AI Workflow Testing
- [ ] **Email Drafting:** Does the Execution Agent draft reflect the episodic memory provided?
- [ ] **Meeting Summary:** Are decision logs extracted correctly from multi-speaker transcripts?

## 4. Agent Routing Testing
- [ ] **Heuristic Hit Rate:** Do regex rules catch >90% of routine intents?
- [ ] **Semantic Fallback:** Does the LLM correctly route ambiguous tasks to `general_query`?

## 5. Token Usage Testing
- [ ] **Tiered Pruning:** Are `priority: 10` components removed before `priority: 1`?
- [ ] **Budget Enforcement:** Does the final assembled prompt stay within the token limit?

## 6. Failure Recovery Testing
- [ ] **LLM Timeout:** Does the router fallback to heuristics if LLM response > 5s?
- [ ] **Agent Crash:** Does the Supervisor provide a "Graceful Refusal" instead of a stack trace?

## 7. Security Testing
- [ ] **Prompt Injection:** Does the system block "ignore previous instructions"?
- [ ] **PII Leaking:** Are sensitive email/phone patterns redacted in generated summaries?
- [ ] **Namespace Isolation:** Confirm `user_id` context is never leaked between sessions.

---

# Automation Testing Flow
1. **Pre-commit:** Run `pytest tests/engine/` (Unit logic).
2. **Post-deploy (Staging):** Trigger `locust` to simulate concurrent multi-agent tasks.
3. **Weekly (Safety):** Execute `test_hallucination.py` against a golden dataset of "Ground Truth" vs "Lies".
