import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from fastapi import HTTPException, status

from app.models.notification import Notification

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: str,
    title: str,
    message: str,
    reference_id: uuid.UUID | None = None,
    reference_type: str | None = None
) -> Notification | None:
    """
    Creates a notification record in the database.
    Never raises — notification failure must never break main flow.
    """
    try:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            reference_id=reference_id,
            reference_type=reference_type,
            is_read=False
        )
        db.add(notification)
        await db.flush()

        logger.info(
            f"Notification created for user {user_id}: "
            f"type='{type}' title='{title}'"
        )
        return notification

    except Exception as e:
        logger.error(
            f"Failed to create notification for user {user_id}: {e}",
            exc_info=True
        )
        return None


async def get_user_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    unread_only: bool = False
) -> dict:
    """
    Returns notifications for a user with unread count.
    Ordered by most recent first.

    unread_only=True  → returns only unread notifications
    unread_only=False → returns all notifications
    unread_count is ALWAYS the total unread regardless of filter.
    """

    # Build main query
    query = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    )

    if unread_only:
        query = query.where(Notification.is_read == False)

    result = await db.execute(query)
    notifications = result.scalars().all()

    # Always get total unread count separately
    # This is independent of the unread_only filter above
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
    )
    unread_count = unread_result.scalar() or 0

    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "total": len(notifications)
    }


async def get_unread_count(
    db: AsyncSession,
    user_id: uuid.UUID
) -> int:
    """
    Returns just the unread count for a user.
    Used by the notification bell badge — lightweight endpoint.
    """
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
    )
    return result.scalar() or 0


async def mark_as_read(
    db: AsyncSession,
    notification_id: uuid.UUID,
    user_id: uuid.UUID
) -> Notification:
    """
    Marks a single notification as read.
    Verifies ownership — users can only read their own notifications.
    """
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    if notification.is_read:
        # Already read — return as-is, no DB write needed
        return notification

    notification.is_read = True
    await db.flush()

    return notification


async def mark_all_as_read(
    db: AsyncSession,
    user_id: uuid.UUID
) -> int:
    """
    Marks ALL unread notifications as read for a user.
    Returns how many were updated.
    Used by "Mark all as read" button in notification panel.
    """
    # Bulk UPDATE — much faster than fetching each and updating one by one
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        .values(is_read=True)
    )
    await db.flush()

    # result.rowcount tells us how many rows were updated
    updated_count = result.rowcount

    logger.info(
        f"Marked {updated_count} notifications as read for user {user_id}"
    )

    return updated_count


async def delete_notification(
    db: AsyncSession,
    notification_id: uuid.UUID,
    user_id: uuid.UUID
) -> None:
    """
    Deletes a single notification.
    Verifies ownership before deleting.
    """
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
    )
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    await db.delete(notification)
    await db.flush()