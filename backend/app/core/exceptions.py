from fastapi import Request, status
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger("automation_engine")

async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to ensure Cognitive OS always returns 
    structured JSON even on internal crashes.
    """
    # Log the full traceback for internal debugging
    logger.error(f"Global exception caught: {exc}\n{traceback.format_exc()}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalEngineError",
            "message": "The Cognitive OS engine encountered an unexpected error.",
            "detail": str(exc),
            "path": request.url.path
        }
    )

class EngineError(Exception):
    """Base class for OS engine errors."""
    pass

class WorkflowExecutionError(EngineError):
    """Raised when a DAG step fails permanently."""
    pass
