from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, memory, agent
from app.api.websockets import router as ws_router
from app.orchestration.bus import event_bus
from app.services.llm import OllamaService
import logging
import os

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ------------------------------------------------------------------ #
    #  Startup                                                            #
    # ------------------------------------------------------------------ #
    await event_bus.start()

    # Verify Ollama connectivity
    llm = OllamaService()
    try:
        models = await llm.list_models()
        if models:
            logger.info(f"Ollama is reachable. Available models: {models}")
        else:
            logger.warning(
                "Ollama responded but returned no models. "
                "Run `ollama pull llama3.2` to download a model."
            )
    except Exception as e:
        logger.warning(
            f"Ollama not reachable at startup ({e}). "
            "Make sure `ollama serve` is running on port 11434."
        )

    from app.agents.supervisor import SupervisorAgent
    from app.agents.coder import CoderAgent
    from app.agents.research import ResearchAgent
    app.state.supervisor = SupervisorAgent()  # Keep ref to prevent GC
    app.state.coder = CoderAgent()
    app.state.research = ResearchAgent()
    logger.info("Cognitive OS Backend initialised successfully (Supervisor, Coder, Research agents loaded).")

    yield

    # ------------------------------------------------------------------ #
    #  Shutdown                                                           #
    # ------------------------------------------------------------------ #
    logger.info("Shutting down Cognitive OS Backend.")


from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-ready Backend API for the multi-agent Cognitive OS. "
        "Powered by local Ollama inference."
    ),
    lifespan=lifespan,
)

# Ensure static directory exists
if not os.path.exists("static"):
    os.makedirs("static")
if not os.path.exists("static/avatars"):
    os.makedirs("static/avatars")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS — allow specific origins for local dev or production Vercel apps
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
if getattr(settings, "ALLOWED_ORIGINS", ""):
    extra_origins = [orig.strip() for orig in settings.ALLOWED_ORIGINS.split(",") if orig.strip()]
    origins.extend(extra_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  Routers                                                            #
# ------------------------------------------------------------------ #
app.include_router(auth.router,   prefix=f"{settings.API_V1_STR}/auth",   tags=["Authentication"])
app.include_router(agent.router,  prefix=f"{settings.API_V1_STR}/agent",  tags=["Agent Orchestration"])
app.include_router(memory.router, prefix=f"{settings.API_V1_STR}/memory", tags=["Memory & Vector Search"])
app.include_router(ws_router,     prefix=f"{settings.API_V1_STR}/ws",     tags=["WebSockets"])


# ------------------------------------------------------------------ #
#  System Routes                                                      #
# ------------------------------------------------------------------ #
@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to Cognitive OS API",
        "version": settings.VERSION,
        "llm_backend": "Ollama (local)",
        "ollama_url": settings.OLLAMA_BASE_URL,
        "default_model": settings.OLLAMA_DEFAULT_MODEL,
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Basic liveness probe."""
    return {"status": "healthy", "version": settings.VERSION}


@app.get("/health/ollama", tags=["System"])
async def ollama_health():
    """Check Ollama reachability and list available models."""
    llm = OllamaService()
    try:
        models = await llm.list_models()
        return {
            "status": "reachable",
            "ollama_url": settings.OLLAMA_BASE_URL,
            "default_model": settings.OLLAMA_DEFAULT_MODEL,
            "available_models": models,
        }
    except Exception as e:
        return {
            "status": "unreachable",
            "error": str(e),
            "hint": "Run `ollama serve` to start the local Ollama server.",
        }


@app.get(f"{settings.API_V1_STR}/ollama/models", tags=["Agent Orchestration"])
async def list_ollama_models():
    """Return all models available on the local Ollama instance."""
    llm = OllamaService()
    models = await llm.list_models()
    return {"models": models}
