from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.engine.router.schema import WorkflowType, AgentTarget
from app.engine.decision.schema import DecisionPackage
from app.engine.safety.schema import SafetyReport
from app.engine.optimization.schema import OptimizationReport

class BaseEngineRequest(BaseModel):
    task: str
    user_id: str
    session_id: Optional[str] = "default"
    metadata: Dict[str, Any] = {}

# /process-query
class ProcessQueryResponse(BaseModel):
    result: str
    task_id: str
    workflow_type: WorkflowType
    safety_report: SafetyReport
    optimization_report: OptimizationReport
    priority_score: float

# /route-workflow
class RouteWorkflowResponse(BaseModel):
    intent: str
    workflow_type: WorkflowType
    primary_agent: AgentTarget
    memory_query: Optional[str]

# /memory-context
class MemoryContextRequest(BaseModel):
    query: str
    user_id: str
    top_k: int = 5

class MemoryChunk(BaseModel):
    content: str
    source_id: str
    relevance: float

class MemoryContextResponse(BaseModel):
    chunks: List[MemoryChunk]
    session_history_snippet: str
    ltm_summary_snippet: str

# /decision-engine
class DecisionRequest(BaseModel):
    task: str
    context_xml: str
    user_profile: Dict[str, Any]

# /token-analysis
class TokenAnalysisRequest(BaseModel):
    components: List[Dict[str, Any]] # List of {name, content, priority}
    budget: int = 128000
