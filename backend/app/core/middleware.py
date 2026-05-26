import time
import logging
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("automation_engine")

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured logging middleware for tracking API performance and requests.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Process the request
        try:
            response: Response = await call_next(request)
        except Exception as e:
            # Errors are handled by the global exception handler, but we log here if needed
            logger.error(f"Unhandled error in middleware: {e}")
            raise e
            
        process_time = time.time() - start_time
        
        # Log request details
        log_data = {
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(process_time * 1000, 2),
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent")
        }
        
        logger.info(f"API Request: {json.dumps(log_data)}")
        
        # Add performance header
        response.headers["X-Process-Time-MS"] = str(round(process_time * 1000, 2))
        
        return response
