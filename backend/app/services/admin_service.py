import uuid
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException, status

from app.models.log import Log
from app.models.user import User
from app.logging.cleanup import cleanup_old_logs, get_log_stats

logger = logging.getLogger(__name__)


async def get_logs(
    db: AsyncSession,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 100
) -> dict:
    """
    Returns CRITICAL logs for admin view.
    Supports date range filtering.
    """
    query = (
        select(Log)
        .where(Log.level == "CRITICAL")
        .order_by(Log.created_at.desc())
        .limit(limit)
    )

    if date_from:
        query = query.where(Log.created_at >= date_from)

    if date_to:
        query = query.where(Log.created_at <= date_to)

    result = await db.execute(query)
    logs = result.scalars().all()

    # Get stats
    stats = await get_log_stats(db)

    return {
        "logs": logs,
        "total": stats["total_logs"],
        "total_last_24h": stats["logs_last_24h"]
    }


async def trigger_log_cleanup(
    db: AsyncSession,
    days: int = 10
) -> dict:
    """
    Manually triggers log cleanup.
    Deletes records older than `days` days.
    Admin can also trigger this manually from the dashboard.
    Auto-cleanup runs nightly via scheduler.
    """
    if days < 1 or days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Days must be between 1 and 365"
        )

    deleted_count = await cleanup_old_logs(db, days)

    return {
        "deleted_count": deleted_count,
        "message": (
            f"Deleted {deleted_count} log records "
            f"older than {days} days"
            if deleted_count > 0
            else f"No log records older than {days} days found"
        )
    }


async def get_all_users(
    db: AsyncSession,
    role: str | None = None
) -> list[User]:
    """
    Returns all users for admin view.
    Optionally filtered by role.
    """
    query = select(User).order_by(User.created_at.desc())

    if role:
        valid_roles = ["patient", "doctor", "admin"]
        if role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Valid values: {valid_roles}"
            )
        query = query.where(User.role == role)

    result = await db.execute(query)
    return result.scalars().all()


async def toggle_user_active(
    db: AsyncSession,
    user_id: uuid.UUID,
    admin_id: uuid.UUID
) -> dict:
    """
    Activates or deactivates a user account.
    Admin cannot deactivate themselves.
    """
    # Prevent self-deactivation
    if user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Toggle the active status
    user.is_active = not user.is_active
    await db.flush()

    action = "activated" if user.is_active else "deactivated"
    logger.info(
        f"Admin {admin_id} {action} user {user_id} ({user.email})"
    )

    return {
        "id": user.id,
        "name": user.name,
        "is_active": user.is_active,
        "message": f"User '{user.name}' has been {action} successfully"
    }

async def change_user_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    new_role: str,
    admin_id: uuid.UUID
) -> dict:
    """
    Changes a user's role between patient and doctor.
    Admin cannot change their own role.
    """
    if user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )

    valid_roles = ["patient", "doctor"]
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Can only change to: {valid_roles}"
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change role of another admin"
        )

    if user.role == new_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is already a {new_role}"
        )

    old_role = user.role
    user.role = new_role
    await db.flush()

    logger.info(
        f"Admin {admin_id} changed user {user_id} "
        f"role from '{old_role}' to '{new_role}'"
    )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "message": f"Role changed from '{old_role}' to '{new_role}' successfully"
    }