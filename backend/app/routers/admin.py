import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.admin import (
    LogListResponse,
    UserAdminResponse,
    UserToggleResponse,
    CleanupResponse
)
from app.services import admin_service
from app.services.order_service import (
    get_all_orders_doctor,
    dispatch_order
)
from app.services.analytics_service import (
    get_consultation_analytics,
    get_revenue_analytics,
    get_patient_analytics,
)
from app.services.token_cleanup_service import (
    get_blocked_token_stats,
    cleanup_expired_tokens,
    cleanup_tokens_older_than,
    cleanup_api_logs_older_than,
)
from app.services.ai_usage_service import get_ai_usage_stats
from app.services.api_monitor_service import get_api_stats
from app.schemas.order import DispatchUpdateRequest
import time
from datetime import datetime, timezone
from sqlalchemy import text

from pydantic import BaseModel

class CleanupRequest(BaseModel):
    days: int = 30

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/logs",
    response_model=LogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get CRITICAL logs (Admin only)"
)
async def get_logs(
    date_from: Optional[datetime] = Query(
        default=None,
        description="Filter logs from this datetime (ISO 8601)"
    ),
    date_to: Optional[datetime] = Query(
        default=None,
        description="Filter logs to this datetime (ISO 8601)"
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
        description="Maximum number of logs to return"
    ),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns CRITICAL level logs from the database.
    Admin uses this to monitor and diagnose issues.

    Filter examples:
    - /api/admin/logs?limit=50
    - /api/admin/logs?date_from=2024-01-01T00:00:00
    """
    return await admin_service.get_logs(db, date_from, date_to, limit)


@router.delete(
    "/logs/cleanup",
    response_model=CleanupResponse,
    status_code=status.HTTP_200_OK,
    summary="Manually trigger log cleanup (Admin only)"
)
async def cleanup_logs(
    days: int = Query(
        default=10,
        ge=1,
        le=365,
        description="Delete logs older than this many days"
    ),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually deletes old log records.
    Auto-cleanup also runs nightly (10 days default).
    """
    return await admin_service.trigger_log_cleanup(db, days)


@router.get(
    "/users",
    response_model=list[UserAdminResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all users (Admin only)"
)
async def get_users(
    role: Optional[str] = Query(
        default=None,
        description="Filter by role: patient, doctor, admin"
    ),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all users across all roles.
    Admin can filter by role to see patients, doctors, or admins.
    """
    return await admin_service.get_all_users(db, role)


@router.put(
    "/users/{user_id}/toggle",
    response_model=UserToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate a user (Admin only)"
)
async def toggle_user(
    user_id: uuid.UUID,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles a user's active status.
    Deactivated users cannot log in.
    Admin cannot deactivate themselves.
    """
    return await admin_service.toggle_user_active(
        db, user_id, current_admin.id
    )


@router.get(
    "/orders",
    status_code=status.HTTP_200_OK,
    summary="Get all orders (Admin only)"
)
async def get_all_orders_admin(
    order_status: Optional[str] = Query(
        default=None,
        alias="status"
    ),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin can view all orders — same as doctor view."""
    return await get_all_orders_doctor(db, order_status)


@router.put(
    "/orders/{order_id}/dispatch",
    status_code=status.HTTP_200_OK,
    summary="Dispatch an order (Admin only)"
)
async def dispatch_order_admin(
    order_id: uuid.UUID,
    data: DispatchUpdateRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin can also mark orders as dispatched."""
    return await dispatch_order(db, order_id, data)


@router.put(
    "/orders/{order_id}/delivered",
    status_code=status.HTTP_200_OK,
    summary="Mark order as delivered (Admin only)"
)
async def mark_delivered_admin(
    order_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin marks an order as delivered."""
    from app.models.order import Order
    from sqlalchemy import select
    from datetime import datetime, timezone

    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.order_status != "dispatched":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order must be 'dispatched' to mark delivered. "
                   f"Current status: '{order.order_status}'"
        )

    order.order_status = "delivered"
    order.delivered_at = datetime.now(timezone.utc)
    await db.flush()

    # Notify patient
    from app.services.notification_service import create_notification
    await create_notification(
        db=db,
        user_id=order.patient_id,
        type="order_delivered",
        title="Your order has been delivered!",
        message="Your homeopathy medicines have been delivered. "
                "We hope you feel better soon!",
        reference_id=order.id,
        reference_type="order"
    )

    return {
        "id": order.id,
        "order_status": order.order_status,
        "delivered_at": order.delivered_at,
        "message": "Order marked as delivered"
    }


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Application health status (Admin only)"
)
async def get_health(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns application health metrics.
    Checks DB connectivity, counts key records.
    """
    health = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {}
    }

    # DB check
    start = time.time()
    try:
        await db.execute(text("SELECT 1"))
        db_ms = round((time.time() - start) * 1000, 2)
        health["checks"]["database"] = {
            "status": "healthy",
            "response_ms": db_ms
        }
    except Exception as e:
        health["status"] = "degraded"
        health["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    # Count key records
    from app.models.user import User as UserModel
    from app.models.consultation import Consultation
    from app.models.order import Order
    from app.models.payment import Payment
    from sqlalchemy import func, select
    from app.config import settings

    try:
        user_count = await db.scalar(
            select(func.count(UserModel.id))
        )
        consult_count = await db.scalar(
            select(func.count(Consultation.id))
        )
        order_count = await db.scalar(
            select(func.count(Order.id))
        )
        revenue = await db.scalar(
            select(func.sum(Order.total_amount)).where(
                Order.payment_status == "success"
            )
        )

        health["checks"]["records"] = {
            "status": "healthy",
            "users": user_count or 0,
            "consultations": consult_count or 0,
            "orders": order_count or 0,
            "total_revenue": float(revenue or 0)
        }
    except Exception as e:
        health["checks"]["records"] = {
            "status": "error",
            "error": str(e)
        }

    # AI provider check
    ai_key = settings.openai_api_key if settings.ai_provider == "openai" else settings.anthropic_api_key
    health["checks"]["ai_provider"] = {
        "status": "configured" if ai_key else "not_configured",
        "provider": settings.ai_provider
    }

    # Add Redis check
    from app.cache.redis_client import get_cache_stats
    redis_stats = await get_cache_stats()

    health["checks"]["redis"] = {
        "status":     redis_stats.get("status"),
        "total_keys": redis_stats.get("total_keys", 0),
        "hit_rate":   _compute_hit_rate(redis_stats),
        "memory":     redis_stats.get("memory_used", "N/A"),
    }

    return health

def _compute_hit_rate(stats: dict) -> str:
    hits   = stats.get("hits", 0)
    misses = stats.get("misses", 0)
    total  = hits + misses
    if total == 0:
        return "N/A"
    return f"{round((hits/total)*100)}%"

class RoleChangeRequest(BaseModel):
    role: str

@router.put(
    "/users/{user_id}/role",
    status_code=status.HTTP_200_OK,
    summary="Change user role (Admin only)"
)
async def change_role(
    user_id: uuid.UUID,
    data: RoleChangeRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await admin_service.change_user_role(
        db, user_id, data.role, current_admin.id
    )


@router.get(
    "/analytics/consultations",
    status_code=status.HTTP_200_OK,
    summary="Consultation analytics (Admin only)"
)
async def consultation_analytics(
    days: int = Query(default=30, ge=7, le=365),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await get_consultation_analytics(db, days)


@router.get(
    "/analytics/revenue",
    status_code=status.HTTP_200_OK,
    summary="Revenue analytics (Admin only)"
)
async def revenue_analytics(
    days: int = Query(default=30, ge=7, le=365),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await get_revenue_analytics(db, days)


@router.get(
    "/analytics/patients",
    status_code=status.HTTP_200_OK,
    summary="Patient analytics (Admin only)"
)
async def patient_analytics(
    days: int = Query(default=30, ge=7, le=365),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await get_patient_analytics(db, days)


@router.get(
    "/cache/stats",
    status_code=status.HTTP_200_OK,
    summary="Get cache statistics (Admin only)"
)
async def get_cache_stats_endpoint(
    _: User = Depends(require_admin)
):
    from app.cache.redis_client import get_cache_stats
    return await get_cache_stats()


@router.delete(
    "/cache/questions",
    status_code=status.HTTP_200_OK,
    summary="Clear all AI question caches (Admin only)"
)
async def clear_question_cache(
    _: User = Depends(require_admin)
):
    """
    Use when AI prompt is updated or questions need refresh.
    Next consultation will regenerate questions from AI.
    """
    from app.cache.redis_client import cache_delete_pattern
    deleted = await cache_delete_pattern("ai_questions:*")
    return {
        "message": f"Cleared {deleted} question cache entries",
        "deleted": deleted
    }


@router.delete(
    "/cache/all",
    status_code=status.HTTP_200_OK,
    summary="Clear entire cache (Admin only)"
)
async def clear_all_cache(
    _: User = Depends(require_admin)
):
    """Nuclear option — clears everything. Use with caution."""
    from app.cache.redis_client import cache_delete_pattern
    deleted = await cache_delete_pattern("*")
    return {
        "message": f"Cleared {deleted} cache entries",
        "deleted": deleted
    }


@router.get(
    "/tokens/stats",
    status_code=status.HTTP_200_OK,
    summary="Blocked token table stats (Admin only)"
)
async def blocked_token_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await get_blocked_token_stats(db)


@router.delete(
    "/tokens/cleanup-expired",
    status_code=status.HTTP_200_OK,
    summary="Delete expired blocked tokens (Admin only)"
)
async def cleanup_expired(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Safest cleanup — only deletes tokens whose JWT has expired."""
    return await cleanup_expired_tokens(db)


@router.delete(
    "/tokens/cleanup-older-than",
    status_code=status.HTTP_200_OK,
    summary="Delete blocked tokens older than N days (Admin only)"
)
async def cleanup_older_than(
    data: CleanupRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """More aggressive — deletes tokens blocked before N days ago."""
    return await cleanup_tokens_older_than(db, data.days)


# ── AI Usage Monitoring ──

@router.get(
    "/monitor/ai-usage",
    status_code=status.HTTP_200_OK,
    summary="AI token usage stats (Admin only)"
)
async def ai_usage_endpoint(
    days: int = Query(default=30, ge=1, le=365),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await get_ai_usage_stats(db, days)


# ── API Request Monitoring ──

@router.get(
    "/monitor/api-requests",
    status_code=status.HTTP_200_OK,
    summary="API request stats (Admin only)"
)
async def api_requests_endpoint(
    days: int = Query(default=7, ge=1, le=90),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await get_api_stats(db, days)


@router.delete(
    "/monitor/api-logs/cleanup",
    status_code=status.HTTP_200_OK,
    summary="Clean up old API request logs (Admin only)"
)
async def cleanup_api_logs(
    data: CleanupRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    return await cleanup_api_logs_older_than(db, data.days)