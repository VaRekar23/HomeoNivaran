import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class FeedbackCreate(BaseModel):
    """Data any logged in user sends to submit feedback."""
    type: str = Field(pattern="^(bug_report|feature_request|general)$")
    page: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Which page the feedback is about e.g. '/consultations'"
    )
    description: str = Field(
        min_length=10,
        max_length=2000,
        description="Detailed description of the feedback"
    )
    rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="Optional 1-5 star rating"
    )
    consultation_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional reference to a specific consultation"
    )


class FeedbackResponse(BaseModel):
    """Feedback returned to the user who submitted it."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    page: Optional[str]
    description: str
    rating: Optional[int]
    status: str
    created_at: datetime


class FeedbackAdminResponse(BaseModel):
    """
    Full feedback detail for admin view.
    Includes user info and admin notes.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    user_name: Optional[str]     # resolved from user relationship
    user_email: Optional[str]
    type: str
    page: Optional[str]
    description: str
    rating: Optional[int]
    consultation_id: Optional[uuid.UUID]
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class FeedbackStatusUpdate(BaseModel):
    """Admin updates feedback status."""
    status: str = Field(pattern="^(new|reviewed|resolved)$")
    admin_notes: Optional[str] = Field(default=None, max_length=1000)