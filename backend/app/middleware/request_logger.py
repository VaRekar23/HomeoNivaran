import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Paths to skip entirely — saves DB writes for noise
SKIP_PATHS = {
    "/api/notifications/unread-count",
    "/api/stats",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
    "/",
}


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs every API request to the database.
    Records: method, path, status code, duration, user info.

    Designed to be lightweight:
    - Skips noisy polling endpoints
    - Never blocks the response on DB write failure
    - Extracts user info from JWT without re-validating
    """

    async def dispatch(
        self,
        request: Request,
        call_next
    ) -> Response:
        # Skip logging for certain paths
        path = request.url.path
        if path in SKIP_PATHS or not path.startswith("/api/"):
            return await call_next(request)

        # Record start time
        start = time.monotonic()

        # Process the request
        response = await call_next(request)

        # Calculate duration
        duration_ms = int((time.monotonic() - start) * 1000)

        # Extract user context from request state
        # (set by auth dependency when JWT is validated)
        user_id   = getattr(request.state, "user_id",   None)
        user_role = getattr(request.state, "user_role", None)

        # Get client IP (handles proxies)
        ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.headers.get("X-Real-IP", "")
            or (request.client.host if request.client else None)
        )

        # Write log in background — don't slow down the response
        import asyncio
        asyncio.ensure_future(
            self._write_log(
                method=request.method,
                path=path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                user_id=user_id,
                user_role=user_role,
                ip_address=ip,
            )
        )

        return response

    async def _write_log(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: int,
        user_id,
        user_role: str | None,
        ip_address: str | None,
    ) -> None:
        """Write the log entry to DB asynchronously."""
        try:
            from app.database import AsyncSessionLocal
            from app.services.api_monitor_service import log_request

            async with AsyncSessionLocal() as session:
                async with session.begin():
                    await log_request(
                        db=session,
                        method=method,
                        path=path,
                        status_code=status_code,
                        duration_ms=duration_ms,
                        user_id=user_id,
                        user_role=user_role,
                        ip_address=ip_address,
                    )
        except Exception as e:
            logger.warning(f"Request log write failed: {e}")