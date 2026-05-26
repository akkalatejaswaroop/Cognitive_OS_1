# Module: Email Automation

## 1. Overview
High-fidelity, grounded email drafting engine.

## 2. Capabilities
- **Episodic Memory Grounding:** Injects past meeting context into drafts.
- **Tone Mapping:** Dynamic system prompts for Professional, Casual, Urgent, and Supportive tones.
- **Structured Synthesis:** Generates subject lines, bodies, action items, and suggested recipients as a single JSON payload.

## 3. Security
- Drafts are stored in `pending_approval` state.
- No automated external I/O without explicit user confirmation in the UI.
