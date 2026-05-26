# Week 4: Bug Tracking Log

## 1. Resolved Issues
| Bug ID | Description | Resolution | Status |
| :--- | :--- | :--- | :--- |
| BUG-401 | Memory leak in EventBus subscribers. | Implemented `unsubscribe()` method in `bus.py`. | FIXED |
| BUG-402 | Circular dependency in AI-generated DAG. | Added cycle detection in `EnhancedWorkflowExecutor.run()`. | FIXED |
| BUG-403 | LLM JSON malformation in Email Engine. | Added markdown block cleaning and retry on JSONDecodeError. | FIXED |
| BUG-404 | Dashboard stat flicker on refresh. | Optimized React state management and Framer Motion layoutId. | FIXED |

## 2. Known Limitations
- **Multi-user contention:** High-frequency DB writes on history logs may need a Redis buffer for >1000 concurrent users.
- **Tone variance:** "Supportive" tone sometimes bleeds into "Casual" for shorter drafts.
