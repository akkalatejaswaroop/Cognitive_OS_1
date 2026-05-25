"""
User Prompt Parser for Cognitive OS.
Enriches raw user input with parsed intent, slots, and metadata.
"""
from typing import Any, Dict, List, Optional
import json

class UserPromptParser:
    def __init__(self):
        pass

    def parse(self, 
              raw_input: str, 
              classified_intent: str, 
              intent_confidence: float,
              sub_intent: Optional[str] = None,
              slots: Dict[str, Any] = None,
              short_term_context: str = "",
              structured_query: str = "",
              metadata: Dict[str, Any] = None) -> str:
        
        slots_json = json.dumps(slots or {}, indent=2)
        
        # Default metadata
        meta = {
            "channel": "api",
            "lang_code": "en",
            "urgency_level": "medium",
            "format": "prose"
        }
        if metadata:
            meta.update(metadata)

        return f"""
<user_turn>
  <raw_input>{raw_input}</raw_input>
  
  <parsed_intent>
    Intent: {classified_intent}
    Confidence: {intent_confidence}
    Sub-intent: {sub_intent or "N/A"}
  </parsed_intent>

  <extracted_slots>
    {slots_json}
  </extracted_slots>

  <conversation_context>
    {short_term_context}
  </conversation_context>

  <formatted_query>
    {structured_query or raw_input}
  </formatted_query>

  <user_metadata>
    Input Channel: {meta.get('channel')}
    Language: {meta.get('lang_code')}
    Urgency: {meta.get('urgency_level')}
    Preferred Output Format: {meta.get('format')}
  </user_metadata>
</user_turn>
"""
