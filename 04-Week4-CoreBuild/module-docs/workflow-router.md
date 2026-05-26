# Module: AI Workflow Router

## 1. Overview
The "Cerebellum" of Cognitive OS. Decides where to send user requests for maximum efficiency and minimum latency.

## 2. Decision Tiers
- **Tier 1 (Heuristic):** Regex-based fast-path (<5ms).
- **Tier 2 (Semantic):** LLM-based intent classification.
- **Tier 3 (Confidence):** Evaluates certainty; triggers clarification if confidence < 0.7.
- **Tier 4 (Fallback):** Safe routing to ResearchAgent for unclassified queries.

## 3. Intent Mapping
Maps intent to specialized agent clusters:
- `email_drafting` -> Execution Agent (Comms cluster)
- `research_assistant` -> Research Agent (Deep-dive cluster)
- `memory_retrieval` -> Memory Agent (RAG cluster)
