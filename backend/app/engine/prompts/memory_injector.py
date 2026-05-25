"""
Cognitive OS Memory Injection Strategy.
Implements tiered memory injection with dynamic budget allocation.
"""
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class MemoryInjector:
    def __init__(self, token_budget: int = 128000):
        self.token_budget = token_budget
        
        # Approximate token weights (characters per token)
        self.chars_per_token = 4

    def inject(self, 
               user_profile: Dict[str, Any],
               session_memory: str,
               episodic_chunks: List[Dict[str, Any]],
               knowledge_chunks: List[Dict[str, Any]],
               longterm_summary: str) -> Dict[str, str]:
        
        budget_remaining = self.token_budget
        
        # Tier 0: Pinned/Core Identity (User Profile)
        core_block = self._build_core_block(user_profile)
        budget_remaining -= self._estimate_tokens(core_block)
        
        # Tier 1: Active Working Memory (Session)
        session_block = session_memory or self._get_session_history_mock()
        budget_remaining -= self._estimate_tokens(session_block)
        
        # Tier 2 & 3: Episodic and Knowledge chunks
        episodic_block = "\n".join([c.get("content", "") for c in episodic_chunks[:10]])
        knowledge_block = "\n".join([f"[{c.get('id', 'doc')}] {c.get('content', '')}" for c in knowledge_chunks[:10]])
        
        # Tier 4: Compressed Long-term Memory
        compressed_block = longterm_summary or self._get_ltm_summary_mock()

        return {
            "core": core_block,
            "session": session_block,
            "episodic": episodic_block,
            "knowledge": knowledge_block,
            "compressed_longterm": compressed_block
        }

    def _get_session_history_mock(self) -> str:
        """Simulates recent session turns."""
        return """
    [User] How is the memory system coming along?
    [AI] I've implemented the tiered injection strategy. We are now working on the router.
    [User] Excellent. Let's make sure it handles calendar planning too.
"""

    def _get_ltm_summary_mock(self) -> str:
        """Simulates a compressed long-term memory summary."""
        return """
    Alex is building a multi-agent cognitive OS. Key decisions: Python/FastAPI, 
    Next.js, ChromaDB. Prefers iterative development and XML-based prompt engineering.
"""

    def _build_core_block(self, profile: Dict[str, Any]) -> str:
        name = profile.get("full_name") or profile.get("name") or "User"
        timezone = profile.get("timezone", "UTC")
        interests = ", ".join(profile.get("interests", []))
        hobbies = ", ".join(profile.get("hobbies", []))
        role = profile.get("role_title", "User")
        company = profile.get("company", "N/A")
        
        return f"""
    User: {name} | Timezone: {timezone} | Role: {role} @ {company}
    Interests: {interests}
    Hobbies: {hobbies}
    Preferences: {json.dumps(profile.get("preferences", {}))}
"""

    def _estimate_tokens(self, text: str) -> int:
        return len(text) // self.chars_per_token

    def format_memory_injection(self, memory_blocks: Dict[str, str]) -> str:
        return f"""
<memory_injection>
  <core>
    {memory_blocks.get('core', '')}
  </core>

  <session>
    {memory_blocks.get('session', '')}
  </session>

  <episodic>
    {memory_blocks.get('episodic', '')}
  </episodic>

  <knowledge>
    {memory_blocks.get('knowledge', '')}
  </knowledge>

  <compressed_longterm>
    {memory_blocks.get('compressed_longterm', '')}
  </compressed_longterm>
</memory_injection>
"""

import json
