"""
Aggregrated Specialist Agent Prompt Registry for Cognitive OS.
"""

from app.engine.prompts.agents.research import RESEARCH_AGENT_SYSTEM, RESEARCH_USER_TEMPLATE, RESEARCH_OUTPUT_SCHEMA
from app.engine.prompts.agents.productivity import PRODUCTIVITY_AGENT_SYSTEM, PRODUCTIVITY_USER_TEMPLATE, PRODUCTIVITY_OUTPUT_SCHEMA
from app.engine.prompts.agents.meeting import MEETING_AGENT_SYSTEM, MEETING_USER_TEMPLATE, MEETING_OUTPUT_SCHEMA
from app.engine.prompts.agents.email import EMAIL_AGENT_SYSTEM, EMAIL_USER_TEMPLATE, EMAIL_OUTPUT_SCHEMA
from app.engine.prompts.agents.memory_retrieval import MEMORY_RETRIEVAL_SYSTEM, MEMORY_RETRIEVAL_USER_TEMPLATE, MEMORY_RETRIEVAL_OUTPUT_SCHEMA
from app.engine.prompts.agents.decision import DECISION_AGENT_SYSTEM, DECISION_USER_TEMPLATE, DECISION_OUTPUT_SCHEMA
from app.engine.prompts.agents.analytics import ANALYTICS_AGENT_SYSTEM, ANALYTICS_USER_TEMPLATE, ANALYTICS_OUTPUT_SCHEMA

AGENT_PROMPT_REGISTRY = {
    "research-agent": {
        "system": RESEARCH_AGENT_SYSTEM,
        "user": RESEARCH_USER_TEMPLATE,
        "schema": RESEARCH_OUTPUT_SCHEMA
    },
    "productivity-agent": {
        "system": PRODUCTIVITY_AGENT_SYSTEM,
        "user": PRODUCTIVITY_USER_TEMPLATE,
        "schema": PRODUCTIVITY_OUTPUT_SCHEMA
    },
    "meeting-assistant": {
        "system": MEETING_AGENT_SYSTEM,
        "user": MEETING_USER_TEMPLATE,
        "schema": MEETING_OUTPUT_SCHEMA
    },
    "email-automation": {
        "system": EMAIL_AGENT_SYSTEM,
        "user": EMAIL_USER_TEMPLATE,
        "schema": EMAIL_OUTPUT_SCHEMA
    },
    "memory-retrieval": {
        "system": MEMORY_RETRIEVAL_SYSTEM,
        "user": MEMORY_RETRIEVAL_USER_TEMPLATE,
        "schema": MEMORY_RETRIEVAL_OUTPUT_SCHEMA
    },
    "decision-support": {
        "system": DECISION_AGENT_SYSTEM,
        "user": DECISION_USER_TEMPLATE,
        "schema": DECISION_OUTPUT_SCHEMA
    },
    "analytics-agent": {
        "system": ANALYTICS_AGENT_SYSTEM,
        "user": ANALYTICS_USER_TEMPLATE,
        "schema": ANALYTICS_OUTPUT_SCHEMA
    }
}
