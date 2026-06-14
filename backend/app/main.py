import logging
from unittest import result
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.request_logger import RequestLoggerMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.middleware.error_handler import (
    global_exception_handler,
    sqlalchemy_exception_handler,
)

import app.models 

from app.routers import (
    auth, family_members, ailments, consultations, doctor, prescriptions, orders, payments, 
    notifications, admin, feedback, addresses, availability, inventory, treatment_feedback
)
from app.dependencies.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.cache.redis_client import get_redis, close_redis

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        csp = "; ".join([
            "default-src 'self'",
            "script-src 'self' https://checkout.razorpay.com",
            "style-src 'self' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
            "frame-src https://api.razorpay.com https://checkout.razorpay.com",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
        ])

        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        response.headers["Content-Security-Policy"] = csp

        if not request.url.hostname in ("localhost", "127.0.0.1"):
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response

def setup_logging():
    """
    Configures the application logging system.

    Two handlers run simultaneously:
    1. StreamHandler  → all levels → console (always active)
    2. DatabaseLogHandler → CRITICAL only → PostgreSQL
                           (only when ANTHROPIC_API_KEY is set,
                            meaning we're in a real environment)
    """
    # Root logger — catches everything
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Console handler — always active, all levels
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        "%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # Database handler — CRITICAL only
    # Only add in non-test environments
    if settings.environment != "test":
        try:
            from app.logging.db_handler import DatabaseLogHandler
            db_handler = DatabaseLogHandler()
            db_handler.setLevel(logging.CRITICAL)
            root_logger.addHandler(db_handler)
            logging.getLogger(__name__).info(
                "Database log handler registered (CRITICAL level only)"
            )
        except Exception as e:
            logging.getLogger(__name__).warning(
                f"Could not register DB log handler: {e}. "
                f"Falling back to console only."
            )


def validate_production_settings():
    """
    Validates critical settings on startup.
    Raises immediately if misconfigured — better to crash
    early than silently run insecurely.
    """
    errors = []

    # ── JWT Secret strength ──
    if not settings.jwt_secret:
        errors.append(
            "JWT_SECRET is not set. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    elif len(settings.jwt_secret) < 32:
        errors.append(
            f"JWT_SECRET is too short ({len(settings.jwt_secret)} chars). "
            f"Minimum 32 characters required."
        )
    elif settings.jwt_secret in (
        "secret", "password", "changeme",
        "your-secret-key", "jwt-secret", "mysecret"
    ):
        errors.append(
            "JWT_SECRET is a known weak value. "
            "Use a cryptographically random string."
        )

    # ── Production-specific checks ──
    if not settings.debug:
        if not settings.database_url:
            errors.append("DATABASE_URL is not set.")
        if not settings.razorpay_key_id:
            errors.append("RAZORPAY_KEY_ID is not set.")
        if not settings.openai_api_key:
            errors.append("OPENAI_API_KEY is not set.")

    if errors:
        for error in errors:
            logger.critical(f"STARTUP VALIDATION FAILED: {error}")
        raise RuntimeError(
            f"Application cannot start — {len(errors)} configuration "
            f"error(s):\n" + "\n".join(f"  • {e}" for e in errors)
        )

    logger.info(
        f"Startup validation passed. "
        f"debug={settings.debug}"
    )


def create_app() -> FastAPI:
    setup_logging()
    validate_production_settings()

    app = FastAPI(
        title="Homeopathy Consultation API",
        version="1.0.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )

    @app.on_event("startup")
    async def startup_event():
        # Test Redis connection on startup
        try:
            redis = await get_redis()
            await redis.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(
                f"Redis unavailable on startup: {e}. "
                f"App will run without cache."
            )


    @app.on_event("shutdown")
    async def shutdown_event():
        await close_redis()
        logger.info("Redis connection closed")

    # ── CORS ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://homeonivaran.in",
            "https://www.homeonivaran.in",
            "https://test.homeonivaran.in",
            "http://test.homeonivaran.in",
            "https://homeonivaran-prod.web.app",
            "https://homeonivaran-test.web.app",
            "http://localhost:5173"
            ],   # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if not settings.debug:
        # Only enforce in production — would block localhost in dev
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[
                "homeoclinic-backend-362585310201.asia-south1.run.app",
                "homeonivaran.in",
                "www.homeonivaran.in",
                "test.homeonivaran.in",
                "www.test.homeonivaran.in",
                # Cloud Run internal URL
                "homeonivaran-test.web.app",
            ]
        )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggerMiddleware)

    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Exception handlers ──
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

    # ── Health check ──
    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok", "app": settings.app_name}
    
    # Add inside create_app() before other routers:
    @app.get("/api/stats", tags=["Public"])
    async def get_public_stats(db: AsyncSession = Depends(get_db)):
        from sqlalchemy import select, func
        from app.models.consultation import Consultation
        from app.models.user import User
        from app.models.ailment import Ailment
        from app.services.treatment_feedback_service import get_feedback_stats
        from app.cache.redis_client import cache_get, cache_set
        from app.cache.cache_keys import public_stats_key
        import math

        cache_key = public_stats_key()
        cached = await cache_get(cache_key)
        if cached:
            return cached

        # Patients treated
        patients_treated = await db.scalar(
            select(func.count(Consultation.id)).where(
                Consultation.status == "closed"
            )
        ) or 0

        # Conditions count
        conditions_count = await db.scalar(
            select(func.count(Ailment.id)).where(
                Ailment.is_active == True
            )
        ) or 0

        # Real satisfaction rate from treatment feedback
        feedback_stats = await get_feedback_stats(db)

        def round_up(n, nearest=100):
            if n == 0:
                return nearest
            return math.ceil(n / nearest) * nearest

        result = {
            "patients_served":         round_up(patients_treated),
            "patients_served_exact":   patients_treated,
            "satisfaction_rate":       feedback_stats["satisfaction_rate"],
            "conditions_treated":      conditions_count,
            "avg_response_hours":      24,
            "total_feedback":          feedback_stats["total_feedback"],
            "would_recommend_pct":     feedback_stats["would_recommend_pct"],
        }

        await cache_set(cache_key, result, 3600)  # 1 hour
        return result

    # ── Routers ──
    app.include_router(auth.router, prefix="/api")
    app.include_router(family_members.router, prefix="/api")
    app.include_router(ailments.router, prefix="/api")
    app.include_router(consultations.router, prefix="/api")
    app.include_router(doctor.router, prefix="/api")
    app.include_router(prescriptions.router, prefix="/api")
    app.include_router(orders.router, prefix="/api")
    app.include_router(payments.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(feedback.router, prefix="/api")
    app.include_router(addresses.router, prefix="/api")
    app.include_router(availability.router, prefix="/api")
    app.include_router(inventory.router, prefix="/api")
    app.include_router(treatment_feedback.router, prefix="/api")

    return app


app = create_app()