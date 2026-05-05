import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackResponse,
    FeedbackAdminResponse,
    FeedbackStatusUpdate
)
from app.services import feedback_service

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post(
    "/",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit feedback"
)
async def submit_feedback(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit feedback about the platform.
    Any logged in user can submit feedback (patient, doctor, admin).
    """
    return await feedback_service.create_feedback(
        db, current_user.id, data
    )


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Get all feedback (Admin only)"
)
async def get_all_feedback(
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by: new, reviewed, resolved"
    ),
    type_filter: Optional[str] = Query(
        default=None,
        alias="type",
        description="Filter by: bug_report, feature_request, general"
    ),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all user feedback. Admin only.
    Filter by status or type.
    """
    return await feedback_service.get_all_feedback(
        db, status_filter, type_filter
    )


@router.put(
    "/{feedback_id}",
    status_code=status.HTTP_200_OK,
    summary="Update feedback status (Admin only)"
)
async def update_feedback(
    feedback_id: uuid.UUID,
    data: FeedbackStatusUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin marks feedback as reviewed or resolved.
    Can also add admin notes.
    """
    return await feedback_service.update_feedback_status(
        db, feedback_id, data
    )