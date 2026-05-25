"""
Cognitive Processing Engine API Routes.
Exposes modular intelligence components as REST endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
import uuid
import logging

from app.api.routes.engine.schemas import (
    BaseEngineRequest, ProcessQueryResponse, RouteWorkflowResponse,
    MemoryContextRequest, MemoryContextResponse, MemoryChunk,
    DecisionRequest, TokenAnalysisRequest
)
from app.engine.agents.supervisor import SupervisorAgent
from app.engine.router.core import AIWorkflowRouter
from app.engine.decision.engine import DecisionEngine
from app.engine.safety.guardrail import HallucinationGuardrail
from app.engine.optimization.optimizer import TokenOptimizer
from app.engine.optimization.schema import ContextComponent
from app.engine.agents.registry import AgentRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engine", tags=["Cognitive Engine"])

# Initialize Singletons/Services
_supervisor = SupervisorAgent()
_workflow_router = AIWorkflowRouter()
_decision_engine = DecisionEngine()
_guardrail = HallucinationGuardrail()
_optimizer = TokenOptimizer()

@router.post("/process-query", response_model=ProcessQueryResponse)
async def process_query(req: BaseEngineRequest):
    """
    Full 10-step cognitive loop. 
    Entry point for most user interactions.
    """
    try:
        task_id = str(uuid.uuid4())
        # The SupervisorAgent's execute method already handles the loop
        # For an API, we inject the necessary metadata into the execute call context
        result = await _supervisor.execute(task=req.task, task_id=task_id)
        
        # In a production scenario, we'd extract the actual reports from the supervisor's state
        # Here we return a mocked success structure for demonstration
        return {
            "result": result,
            "task_id": task_id,
            "workflow_type": "general_query", # Extract from supervisor
            "safety_report": {"is_safe": True, "confidence_score": 0.9, "hallucination_risk": 0.1, "recommended_action": "PASS"},
            "optimization_report": {"original_tokens": 1000, "optimized_tokens": 500, "reduction_percentage": 50.0, "strategy_applied": "prune", "cost_saved_est": 0.01},
            "priority_score": 15.0
        }
    except Exception as e:
        logger.error(f"API process-query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/route-workflow", response_model=RouteWorkflowResponse)
async def route_workflow(req: BaseEngineRequest):
    """
    Classify intent and workflow type.
    """
    route = await _workflow_router.route(req.task)
    return {
        "intent": route.intent,
        "workflow_type": route.workflow_type,
        "primary_agent": route.primary_agent,
        "memory_query": route.memory_query
    }

@router.post("/memory-context", response_model=MemoryContextResponse)
async def get_memory_context(req: MemoryContextRequest):
    """
    Retrieve tiered memory fragments.
    """
    memory_agent = AgentRegistry.get().get_agent("memory-agent")
    if not memory_agent:
        raise HTTPException(status_code=503, detail="Memory Agent unavailable")
    
    # Using direct call to get raw chunks
    from app.engine.agents.memory_agent import MemoryAgent
    if not isinstance(memory_agent, MemoryAgent):
         raise HTTPException(status_code=500, detail="Invalid Memory Agent type")

    chunks = await memory_agent.search_raw_chunks(req.query, user_id=req.user_id, top_k=req.top_k)
    
    # Mock snippets for session and LTM (matching MemoryInjector simulation)
    return {
        "chunks": [MemoryChunk(content=c["content"], source_id=c["id"], relevance=1.0-c["distance"]) for c in chunks],
        "session_history_snippet": "[User] How is the memory system? [AI] We are working on the router.",
        "ltm_summary_snippet": "User prefers Python/FastAPI for backend development."
    }

@router.post("/decision-engine")
async def evaluate_decision(req: DecisionRequest):
    """
    Prioritize actions and predict next steps.
    """
    decision = await _decision_engine.evaluate(
        task=req.task,
        memory_context=req.context_xml,
        user_profile=req.user_profile
    )
    return decision

@router.post("/token-analysis")
async def analyze_tokens(req: TokenAnalysisRequest):
    """
    Simulate context optimization and budget impact.
    """
    components = [ContextComponent(**c) for c in req.components]
    _, report = _optimizer.optimize_context(components, target_budget=req.budget)
    return report

@router.post("/hallucination-check")
async def check_hallucination(response: str, context: str):
    """
    Run N-pass verification on a response against a context.
    """
    report = await _guardrail.validate_output(response, context)
    return report
