import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.api_request_log import APIRequestLog

logger = logging.getLogger(__name__)

# Patterns to normalize paths
# Replaces UUIDs in paths so /consultations/uuid-1 and
# /consultations/uuid-2 both become /consultations/{id}
UUID_PATTERN = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE
)

# Paths to SKIP logging — too noisy or health-check spam
SKIP_PATHS = {
    "/api/notifications/unread-count",
    "/api/stats",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/favicon.ico",
}


def normalize_path(path: str) -> str:
    """
    Replace UUIDs in URL paths with {id} placeholder.
    /api/consultations/abc123.../prescription
    → /api/consultations/{id}/prescription

    This groups similar endpoints together in analytics.
    """
    return UUID_PATTERN.sub("{id}", path)


async def log_request(
    db: AsyncSession,
    method: str,
    path: str,
    status_code: int,
    duration_ms: int,
    user_id: Optional[uuid.UUID] = None,
    user_role: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Records an API request. Called by middleware.
    Skips noisy health-check endpoints.
    Never raises.
    """
    try:
        # Skip logging for noisy paths
        normalized = normalize_path(path)
        if path in SKIP_PATHS:
            return

        log = APIRequestLog(
            method=method,
            path=normalized,
            status_code=status_code,
            duration_ms=duration_ms,
            user_id=user_id,
            user_role=user_role,
            ip_address=ip_address,
            is_error=status_code >= 400,
        )
        db.add(log)
        await db.flush()
    except Exception as e:
        logger.warning(f"Failed to log API request: {e}")


async def get_api_stats(
    db: AsyncSession,
    days: int = 7
) -> dict:
    """API monitoring stats for admin dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Overall totals
    totals = await db.execute(
        select(
            func.count(APIRequestLog.id).label("total_requests"),
            func.count(APIRequestLog.id).filter(
                APIRequestLog.is_error == True
            ).label("error_requests"),
            func.avg(APIRequestLog.duration_ms).label("avg_duration"),
            func.max(APIRequestLog.duration_ms).label("max_duration"),
        ).where(APIRequestLog.created_at >= since)
    )
    row = totals.one()
    total   = row.total_requests or 0
    errors  = row.error_requests or 0
    error_rate = round((errors / total) * 100, 1) if total > 0 else 0

    # Top endpoints by request count
    top_endpoints = await db.execute(
        select(
            APIRequestLog.method,
            APIRequestLog.path,
            func.count(APIRequestLog.id).label("hits"),
            func.avg(APIRequestLog.duration_ms).label("avg_ms"),
            func.count(APIRequestLog.id).filter(
                APIRequestLog.is_error == True
            ).label("errors"),
        ).where(
            APIRequestLog.created_at >= since
        ).group_by(
            APIRequestLog.method,
            APIRequestLog.path
        ).order_by(
            func.count(APIRequestLog.id).desc()
        ).limit(20)
    )
    top_eps = [
        {
            "method":  r.method,
            "path":    r.path,
            "hits":    r.hits,
            "avg_ms":  round(float(r.avg_ms or 0)),
            "errors":  r.errors,
        }
        for r in top_endpoints
    ]

    # Slowest endpoints
    slowest = await db.execute(
        select(
            APIRequestLog.method,
            APIRequestLog.path,
            func.avg(APIRequestLog.duration_ms).label("avg_ms"),
            func.count(APIRequestLog.id).label("hits"),
        ).where(
            APIRequestLog.created_at >= since,
            APIRequestLog.is_error == False,
            # Ignore errors from slow endpoint calculation
        ).group_by(
            APIRequestLog.method,
            APIRequestLog.path
        ).having(
            func.count(APIRequestLog.id) >= 5
            # Only endpoints hit at least 5 times
        ).order_by(
            func.avg(APIRequestLog.duration_ms).desc()
        ).limit(10)
    )
    slowest_eps = [
        {
            "method": r.method,
            "path":   r.path,
            "avg_ms": round(float(r.avg_ms or 0)),
            "hits":   r.hits,
        }
        for r in slowest
    ]

    # Status code breakdown
    status_result = await db.execute(
        select(
            APIRequestLog.status_code,
            func.count(APIRequestLog.id).label("count"),
        ).where(
            APIRequestLog.created_at >= since
        ).group_by(APIRequestLog.status_code)
        .order_by(APIRequestLog.status_code.asc())
    )
    by_status = [
        {"status": r.status_code, "count": r.count}
        for r in status_result
    ]

    # Requests by role
    role_result = await db.execute(
        select(
            APIRequestLog.user_role,
            func.count(APIRequestLog.id).label("count"),
        ).where(
            APIRequestLog.created_at >= since
        ).group_by(APIRequestLog.user_role)
    )
    by_role = [
        {
            "role":  r.user_role or "unauthenticated",
            "count": r.count
        }
        for r in role_result
    ]

    # Hourly distribution (peak hour detection)
    hourly_result = await db.execute(
        select(
            func.extract("hour", APIRequestLog.created_at).label("hour"),
            func.count(APIRequestLog.id).label("count"),
        ).where(
            APIRequestLog.created_at >= since
        ).group_by(
            func.extract("hour", APIRequestLog.created_at)
        ).order_by(
            func.extract("hour", APIRequestLog.created_at).asc()
        )
    )
    by_hour = [
        {"hour": int(r.hour), "count": r.count}
        for r in hourly_result
    ]

    # Daily trend
    day_trunc = func.date_trunc("day", APIRequestLog.created_at)

    daily_result = await db.execute(
        select(
            day_trunc.label("day"),
            func.count(APIRequestLog.id).label("requests"),
            func.count(APIRequestLog.id).filter(
                APIRequestLog.is_error == True
            ).label("errors"),
        )
        .where(APIRequestLog.created_at >= since)
        .group_by(day_trunc)
        .order_by(day_trunc.asc())
    )
    daily = [
        {
            "date":     r.day.strftime("%Y-%m-%d"),
            "requests": r.requests,
            "errors":   r.errors,
        }
        for r in daily_result
    ]

    return {
        "period_days":     days,
        "total_requests":  total,
        "error_requests":  errors,
        "error_rate_pct":  error_rate,
        "avg_duration_ms": round(float(row.avg_duration or 0)),
        "max_duration_ms": int(row.max_duration or 0),
        "top_endpoints":   top_eps,
        "slowest_endpoints": slowest_eps,
        "by_status_code":  by_status,
        "by_role":         by_role,
        "by_hour":         by_hour,
        "daily_trend":     daily,
    }