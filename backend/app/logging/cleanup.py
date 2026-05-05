import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, func, select
from app.models.log import Log

logger = logging.getLogger(__name__)


async def cleanup_old_logs(db: AsyncSession, days: int = 10) -> int:
    """
    Deletes log records older than `days` days.
    Called by the scheduled cleanup job every night.

    Returns count of deleted records.
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Count before deleting (for the response)
    count_result = await db.execute(
        select(func.count(Log.id)).where(
            Log.created_at < cutoff_date
        )
    )
    count = count_result.scalar() or 0

    if count == 0:
        logger.info("Log cleanup: no old records to delete")
        return 0

    # Bulk delete old records
    await db.execute(
        delete(Log).where(Log.created_at < cutoff_date)
    )
    await db.commit()

    logger.info(
        f"Log cleanup: deleted {count} records older than {days} days"
    )
    return count


async def get_log_stats(db: AsyncSession) -> dict:
    """
    Returns log statistics for the admin dashboard.
    """
    # Total logs
    total_result = await db.execute(select(func.count(Log.id)))
    total = total_result.scalar() or 0

    # Logs in last 24 hours
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_result = await db.execute(
        select(func.count(Log.id)).where(Log.created_at >= yesterday)
    )
    recent = recent_result.scalar() or 0

    # Oldest log date
    oldest_result = await db.execute(
        select(func.min(Log.created_at))
    )
    oldest = oldest_result.scalar()

    return {
        "total_logs": total,
        "logs_last_24h": recent,
        "oldest_log_date": oldest
    }