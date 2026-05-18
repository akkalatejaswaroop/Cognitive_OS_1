from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, memory, agent
from app.api.websockets import router as ws_router
from app.orchestration.bus import event_bus
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Event Bus and initialize agents
    await event_bus.start()
    
    from app.agents.supervisor import SupervisorAgent
    # Keep reference to prevent GC
    app.state.supervisor = SupervisorAgent()
    logger.info("Cognitive OS Backend initialized successfully.")
    
    yield
    
    # Shutdown logic (if any)
    logger.info("Shutting down Cognitive OS Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready Backend API for the multi-agent Cognitive OS",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(agent.router, prefix=f"{settings.API_V1_STR}/agent", tags=["Agent Orchestration"])
app.include_router(memory.router, prefix=f"{settings.API_V1_STR}/memory", tags=["Memory & Vector Search"])
app.include_router(ws_router, prefix=f"{settings.API_V1_STR}/ws", tags=["WebSockets"])

@app.get("/")
async def root():
    return {"message": "Welcome to Cognitive OS API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}
