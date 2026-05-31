import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, and_

from app.models.blocked_token import BlockedToken

logger = logging.getLogger(__name__)


async def get_blocked_token_stats(db: AsyncSession) -> dict:
    """Returns stats about the blocked_tokens table."""
    now = datetime.now(timezone.utc)

    total = await db.scalar(
        select(func.count(BlockedToken.jti))
    ) or 0

    expired = await db.scalar(
        select(func.count(BlockedToken.jti)).where(
            BlockedToken.expires_at < now
        )
    ) or 0

    oldest_result = await db.execute(
        select(func.min(BlockedToken.blocked_at))
    )
    oldest = oldest_result.scalar()

    # Estimate size (rough: each row ≈ 200 bytes)
    size_bytes = total * 200
    size_kb    = round(size_bytes / 1024, 1)

    return {
        "total_tokens":      total,
        "expired_tokens":    expired,
        "active_tokens":     total - expired,
        "oldest_entry":      oldest.isoformat() if oldest else None,
        "estimated_size_kb": size_kb,
        "estimated_size_mb": round(size_kb / 1024, 3),
    }


async def cleanup_expired_tokens(db: AsyncSession) -> dict:
    """
    Deletes all tokens whose JWT expiry time has passed.
    These are safe to delete — they're already invalid.
    This is the safest and most common cleanup.
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        delete(BlockedToken).where(
            BlockedToken.expires_at < now
        )
    )
    deleted = result.rowcount
    await db.flush()

    logger.info(
        f"Cleaned up {deleted} expired blocked tokens"
    )

    return {
        "deleted":   deleted,
        "message":   f"Deleted {deleted} expired tokens",
        "cleaned_at": now.isoformat(),
    }


async def cleanup_tokens_older_than(
    db: AsyncSession,
    days: int
) -> dict:
    """
    Deletes tokens blocked more than N days ago.
    More aggressive than expired-only cleanup.
    Use when expires_at is not stored or table grows too large.
    """
    if days < 1:
        raise ValueError("days must be at least 1")

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        delete(BlockedToken).where(
            BlockedToken.blocked_at < cutoff
        )
    )
    deleted = result.rowcount
    await db.flush()

    logger.info(
        f"Cleaned up {deleted} tokens older than {days} days"
    )

    return {
        "deleted":    deleted,
        "cutoff_date": cutoff.isoformat(),
        "message":    f"Deleted {deleted} tokens blocked before "
                      f"{cutoff.strftime('%d %b %Y %H:%M UTC')}",
    }


async def cleanup_api_logs_older_than(
    db: AsyncSession,
    days: int
) -> dict:
    """
    Clean up old API request logs.
    These grow fast — prune aggressively.
    Recommended: keep only 30 days of API logs.
    """
    from app.models.api_request_log import APIRequestLog

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        delete(APIRequestLog).where(
            APIRequestLog.created_at < cutoff
        )
    )
    deleted = result.rowcount
    await db.flush()

    logger.info(
        f"Cleaned up {deleted} API request logs older than {days} days"
    )

    return {
        "deleted": deleted,
        "message": f"Deleted {deleted} API request log entries"
    }