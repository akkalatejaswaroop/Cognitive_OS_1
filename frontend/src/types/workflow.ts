/**
 * Cognitive OS — AI Workflow Router Types
 * Sync with backend/app/orchestration/router/schema.py
 */

export enum WorkflowType {
  MEETING_SUMMARY = "meeting_summary",
  EMAIL_DRAFTING = "email_drafting",
  REMINDER_GENERATION = "reminder_generation",
  RESEARCH_ASSISTANT = "research_assistant",
  PRODUCTIVITY_ANALYTICS = "productivity_analytics",
  MEMORY_RETRIEVAL = "memory_retrieval",
  CALENDAR_PLANNING = "calendar_planning",
  DOCUMENT_SUMMARIZATION = "document_summarization",
  GENERAL_QUERY = "general_query",
}

export enum AgentTarget {
  RESEARCHER = "research-agent",
  EXECUTIVE = "execution-agent",
  PLANNER = "planning-agent",
  MEMORY = "memory-agent",
  SUMMARY = "summary-agent",
}

export interface WorkflowRoute {
  intent: string;
  workflow_type: WorkflowType;
  primary_agent: AgentTarget;
  priority: number;
  memory_query?: string;
}

export interface AgentExecutionRequest {
  task: string;
  session_id?: string;
  user_id?: string;
}

export interface AgentExecutionResponse {
  result: string;
  task_id: string;
  status: "completed" | "failed" | "thinking";
  route?: WorkflowRoute;
}
