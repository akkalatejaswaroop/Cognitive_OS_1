from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field

class WorkflowType(str, Enum):
    MEETING_SUMMARY = "meeting_summary"
    EMAIL_DRAFT = "email_drafting"
    REMINDER = "reminder_generation"
    RESEARCH = "research_assistant"
    ANALYTICS = "productivity_analytics"
    MEMORY_RECALL = "memory_retrieval"
    CALENDAR = "calendar_planning"
    DOC_SUMMARY = "document_summarization"
    GENERAL_QUERY = "general_query"

class AgentTarget(str, Enum):
    RESEARCHER = "research-agent"
    EXECUTIVE = "execution-agent"
    PLANNER = "planning-agent"
    MEMORY = "memory-agent"
    SUMMARY = "summary-agent"

class WorkflowRoute(BaseModel):
    intent: str
    workflow_type: WorkflowType
    primary_agent: AgentTarget
    sub_tasks: List[str] = []
    memory_query: Optional[str] = None
    priority: int = Field(default=3, ge=1, le=5) # 1 = High, 5 = Low

AGENT_MAPPING: Dict[WorkflowType, AgentTarget] = {
    WorkflowType.MEETING_SUMMARY: AgentTarget.SUMMARY,
    WorkflowType.EMAIL_DRAFT: AgentTarget.EXECUTIVE,
    WorkflowType.REMINDER: AgentTarget.PLANNER,
    WorkflowType.RESEARCH: AgentTarget.RESEARCHER,
    WorkflowType.ANALYTICS: AgentTarget.RESEARCHER,
    WorkflowType.MEMORY_RECALL: AgentTarget.MEMORY,
    WorkflowType.CALENDAR: AgentTarget.PLANNER,
    WorkflowType.DOC_SUMMARY: AgentTarget.SUMMARY,
    WorkflowType.GENERAL_QUERY: AgentTarget.RESEARCHER
}
