"""
Cognitive OS — FastAPI Application Entry Point
Six-agent multi-agent system: Orchestrator, Memory, Planning, Research, Execution, Summary.
"""
from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes import auth, memory, agent, workspaces
from app.api.routes.workflows import router as workflows_router
from app.api.routes.engine import routes as engine_routes
from app.api.routes.engine import automation as automation_routes
from app.api.websockets import router as ws_router
from app.orchestration.bus import event_bus

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    # ------------------------------------------------------------------ #
    #  Startup                                                            #
    # ------------------------------------------------------------------ #

    # Start the event bus
    await event_bus.start()

    # Import tools package so built-in tools are registered
    import app.tools  # noqa: F401

    # Verify LLM backend
    from app.llm.factory import get_llm_provider
    provider = get_llm_provider()
    try:
        models = await provider.list_models()
        if models:
            logger.info(f"LLM backend ready. Models: {models[:3]}…")
        else:
            logger.warning(
                "LLM backend reachable but returned no models. "
                "Run `ollama pull llama3.2` or set OPENAI_API_KEY."
            )
    except Exception as exc:
        logger.warning(
            f"LLM backend not reachable at startup ({exc}). "
            "Agents will use fallback responses until backend is available."
        )

    # ── Register all six agents ──────────────────────────────────────────
    from app.engine.agents.registry import AgentRegistry
    from app.engine.agents.supervisor import SupervisorAgent
    from app.engine.agents.memory_agent import MemoryAgent
    from app.engine.agents.planning_agent import PlanningAgent
    from app.engine.agents.research import ResearchAgent
    from app.engine.agents.execution_agent import ExecutionAgent
    from app.engine.agents.summary_agent import SummaryAgent
    # Keep CoderAgent for backward compat (legacy topic: agent.coder-agent)
    from app.engine.agents.coder import CoderAgent

    registry = AgentRegistry.get()

    agents = [
        SupervisorAgent(),
        MemoryAgent(),
        PlanningAgent(),
        ResearchAgent(),
        ExecutionAgent(),
        SummaryAgent(),
        CoderAgent(),           # legacy — topic: agent.coder-agent
    ]

    for agent_instance in agents:
        registry.register(agent_instance)
        fastapi_app.state.__dict__[agent_instance.name] = agent_instance

    logger.info(
        f"Cognitive OS started. Active agents: {registry.agent_names()}"
    )

    yield

    # ------------------------------------------------------------------ #
    #  Shutdown                                                           #
    # ------------------------------------------------------------------ #
    for agent_instance in agents:
        try:
            await agent_instance.on_shutdown()
        except Exception as exc:
            logger.warning(f"Error shutting down {agent_instance.name}: {exc}")

    logger.info("Cognitive OS shutdown complete.")


# ── Static directories ───────────────────────────────────────────────────────
for _dir in ["static", "static/avatars", "logs"]:
    os.makedirs(_dir, exist_ok=True)

# ── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-ready Multi-Agent Backend for Cognitive OS. "
        "Six-agent pipeline: Orchestrator → Memory → Planning → Research → Execution → Summary."
    ),
    lifespan=lifespan,
)

# ── Static files ─────────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── CORS ─────────────────────────────────────────────────────────────────────
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
if getattr(settings, "ALLOWED_ORIGINS", ""):
    extra = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    origins.extend(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
V1 = settings.API_V1_STR

app.include_router(auth.router,        prefix=f"{V1}/auth",       tags=["Authentication"])
app.include_router(agent.router,       prefix=f"{V1}/agent",      tags=["Agent Orchestration"])
app.include_router(memory.router,      prefix=f"{V1}/memory",     tags=["Memory & Vector Search"])
app.include_router(ws_router,          prefix=f"{V1}/ws",         tags=["WebSockets"])
app.include_router(workspaces.router,  prefix=f"{V1}/workspaces", tags=["Workspaces"])
app.include_router(workflows_router,   prefix=f"{V1}/workflows",  tags=["Workflows"])
app.include_router(engine_routes.router, prefix=f"{V1}",           tags=["Cognitive Engine"])
app.include_router(automation_routes.router, prefix=f"{V1}",      tags=["Workflow Automation"])


# ── System routes ─────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    from app.engine.agents.registry import AgentRegistry
    return {
        "message": "Welcome to Cognitive OS API",
        "version": settings.VERSION,
        "agents": AgentRegistry.get().agent_names(),
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Liveness probe."""
    return {"status": "healthy", "version": settings.VERSION}


@app.get("/health/agents", tags=["System"])
async def agent_health():
    """Circuit-breaker states for all agents (no auth required — for monitoring)."""
    from app.orchestration.circuit_breaker import circuit_registry
    return {"agents": circuit_registry.all_states()}


@app.get("/health/llm", tags=["System"])
async def llm_health():
    """LLM backend connectivity check."""
    from app.llm.factory import get_llm_provider
    provider = get_llm_provider()
    try:
        models = await provider.list_models()
        return {"status": "reachable", "backend": type(provider).__name__, "models": models}
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"LLM health check failed: {exc}")
        return {"status": "unreachable", "backend": type(provider).__name__, "error": "Internal error occurred while connecting to LLM backend."}
