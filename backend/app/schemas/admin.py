import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LogResponse(BaseModel):
    """A single log record returned to admin."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    level: str
    message: str
    module: Optional[str]
    function_name: Optional[str]
    line_number: Optional[int]
    traceback: Optional[str]
    request_url: Optional[str]
    request_method: Optional[str]
    user_id: Optional[uuid.UUID]
    created_at: datetime


class LogListResponse(BaseModel):
    """Paginated log list with stats."""
    logs: list[LogResponse]
    total: int
    total_last_24h: int


class UserAdminResponse(BaseModel):
    """User info for admin view."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str
    role: str
    is_active: bool
    created_at: datetime


class UserToggleResponse(BaseModel):
    """Response after toggling user active status."""
    id: uuid.UUID
    name: str
    is_active: bool
    message: str


class CleanupResponse(BaseModel):
    """Response after log cleanup."""
    deleted_count: int
    message: str