"""
AI Workflow Router Logic System for Cognitive OS.

This document specifies the routing tiers, classification logic, 
and multi-agent dispatch patterns.
"""

# ============================================================================ #
#  1. ROUTING DECISION TREE
# ============================================================================ #

"""
Tier 1: Heuristic Fast-Path (Latency: < 5ms)
  - Regex-based matching for unambiguous keywords (e.g., "remind me", "draft email").
  - Outcome: Direct dispatch or pass to Tier 2.

Tier 2: Semantic Intent Classification (Latency: 500ms - 1.5s)
  - LLM-powered analysis using `ROUTER_SYSTEM_PROMPT`.
  - Confidence Scoring: LLM evaluates its own certainty (0.0 - 1.0).
  - Outcome: Workflow selection with memory query injection.

Tier 3: Collaborative Refinement (Latency: Variable)
  - Used if Tier 2 confidence < 0.7.
  - Action: Query the `PlanningAgent` to clarify intent or multi-route.

Tier 4: Fallback (Terminal)
  - Outcome: `general_query` routed to ResearchAgent.
"""

# ============================================================================ #
#  2. ENHANCED ROUTING PROMPT
# ============================================================================ #

ENHANCED_ROUTER_PROMPT = """
You are the Cognitive OS Intelligence Router. Your mission is to map user intent 
to the most efficient specialized workflow.

### WORKFLOW REGISTRY:
1. **meeting_summary:** Distilling meetings, identifying participants and action items.
2. **email_drafting:** Creating professional outreach, replies, or internal comms.
3. **reminder_generation:** Temporal tasks, deadline prediction, and context-aware alerts.
4. **research_assistant:** Web search, code analysis, deep dives into complex topics.
5. **productivity_optimization:** Analyzing user habits, token usage, or goal alignment.
6. **memory_retrieval:** Searching past interactions, facts about the user, or history.

### ROUTING LOGIC:
- If the user asks about the future or time -> **reminder_generation**.
- If the user asks about the past or "what did I" -> **memory_retrieval**.
- If the request involves people and messaging -> **email_drafting**.
- If the request involves "how to" or data gathering -> **research_assistant**.

### OUTPUT (JSON):
{
  "intent_id": "string_slug",
  "workflow": "key_from_registry",
  "confidence": 0.0-1.0,
  "requires_memory": true/false,
  "reasoning": "one-sentence technical justification",
  "priority": 1-5
}
"""

# ============================================================================ #
#  3. MULTI-AGENT ROUTING LOGIC
# ============================================================================ #

"""
The Router doesn't just pick a workflow; it prepares the specialized agent's context.

1.  **Memory Injection:** If `requires_memory` is true, the Router generates a 
    vector search query BEFORE dispatching to the target agent.
2.  **Priority Queuing:** High priority (1-2) tasks skip the standard EventBus 
    buffer and are processed by reserved 'Hot Worker' threads.
3.  **Parallel Routing:** If an intent spans multiple workflows (e.g., "Summarize 
    meeting AND set reminders"), the Router emits multiple events to the bus 
    simultaneously.
"""
