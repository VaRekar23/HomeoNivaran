import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """A single notification returned to the user."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    message: str
    reference_id: Optional[uuid.UUID]
    reference_type: Optional[str]
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    """
    Paginated notification list with unread count.
    unread_count drives the badge on the notification bell icon.
    """
    notifications: list[NotificationResponse]
    unread_count: int
    total: int