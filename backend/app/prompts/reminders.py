"""
Smart Reminder Scoring Algorithm & Logic.
Defines how Cognitive OS prioritizes and times notifications.
"""

# ============================================================================ #
#  1. SMART PRIORITY SCORE (SPS) ALGORITHM
# ============================================================================ #

"""
The SPS determines the order of notifications and the "intensity" of alerts.

Formula:
  SPS = (Urgency * 0.45) + (Importance * 0.35) + (ContextFit * 0.20)

Components:
1. Urgency (0-10):
   - Linear decay from deadline: U = max(0, 10 - (HoursToDeadline / K))
   - K is a scaling factor based on task duration.

2. Importance (0-10):
   - LLM-rated impact of the task on user's long-term goals.
   - Factors: Stakeholders involved, project weight, recurrence.

3. ContextFit (0-10):
   - Binary/Heuristic match with user's current environment.
   - e.g. "Work" task is 10 if user is in "Deep Work" mode or at office.
   - e.g. "Grocery" task is 10 if user is near a supermarket (Geofencing).

Learning Adjustment:
  If a user snoozes a reminder > 3 times, SPS is penalized for the current context, 
  triggering the system to suggest a "Context Change" (e.g. "You seem busy, should I remind you when you get home?").
"""

# ============================================================================ #
#  2. AI REMINDER PROMPT (GPT-4o / Llama-3)
# ============================================================================ #

SMART_REMINDER_PROMPT = """
You are the Cognitive OS Memory & Temporal Agent. Your job is to extract 
actionable reminders from unstructured user input (emails, notes, transcripts) 
and predict likely deadlines.

### EXTRACTION RULES:
1. IDENTIFY: Look for commitments, appointments, "should do", "remind me", and implicit tasks.
2. PREDICT: If no deadline is mentioned, predict a logical one based on the context 
   (e.g., "send the report" -> end of current work day).
3. CLASSIFY: Assign an Importance score (1-10) and a Category (Work, Personal, Health, Finance).
4. CONTEXT: Define the 'ideal context' for the reminder (e.g., "Home", "Office", "Laptop", "Mobile").

### OUTPUT FORMAT (JSON):
[
  {
    "content": "Brief, actionable reminder text",
    "due_at": "ISO-8601 timestamp",
    "is_predicted_deadline": true/false,
    "importance": 1-10,
    "category": "String",
    "context_requirements": ["list", "of", "tags"],
    "reasoning": "Why this reminder was created"
  }
]

### INPUT CONTEXT:
<source_data>
{{source_data}}
</source_data>

<user_habits>
{{user_habits}}
</user_habits>

<current_time>
{{current_time}}
</current_time>
"""
