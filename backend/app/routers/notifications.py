import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "/",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get notifications for logged in user"
)
async def get_notifications(
    unread_only: bool = Query(
        default=False,
        description="If true, returns only unread notifications"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns notifications for the logged in user.
    Works for both patients and doctors.

    Query params:
    - unread_only=false (default) → all notifications
    - unread_only=true → only unread

    Response always includes unread_count for the bell badge.
    """
    result = await notification_service.get_user_notifications(
        db, current_user.id, unread_only
    )
    return result


@router.get(
    "/unread-count",
    status_code=status.HTTP_200_OK,
    summary="Get unread notification count"
)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns just the unread count.
    Lightweight endpoint — used to refresh the bell badge
    without fetching all notifications.
    Called frequently (e.g. every 30 seconds) by the frontend.
    """
    count = await notification_service.get_unread_count(
        db, current_user.id
    )
    return {"unread_count": count}


@router.put(
    "/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read"
)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks all unread notifications as read.
    Returns how many were updated.
    """
    updated = await notification_service.mark_all_as_read(
        db, current_user.id
    )
    return {
        "message": f"Marked {updated} notifications as read",
        "updated": updated
    }


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a single notification as read"
)
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks a single notification as read.
    Returns 404 if notification doesn't belong to this user.
    """
    notification = await notification_service.mark_as_read(
        db, notification_id, current_user.id
    )
    return notification


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a notification"
)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently deletes a notification.
    Returns 404 if notification doesn't belong to this user.
    """
    await notification_service.delete_notification(
        db, notification_id, current_user.id
    )
    return {"message": "Notification deleted successfully"}