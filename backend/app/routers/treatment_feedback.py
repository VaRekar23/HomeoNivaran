import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_patient, require_admin, require_doctor
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.treatment_feedback import TreatmentFeedbackCreate
from app.services import treatment_feedback_service

router = APIRouter(
    prefix="/treatment-feedback",
    tags=["Treatment Feedback"]
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: TreatmentFeedbackCreate,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """Patient submits treatment feedback."""
    return await treatment_feedback_service.submit_treatment_feedback(
        db, current_user.id, data
    )


@router.get(
    "/consultation/{consultation_id}",
    status_code=status.HTTP_200_OK
)
async def get_feedback(
    consultation_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback for a specific consultation."""
    return await treatment_feedback_service.get_feedback_for_consultation(
        db, consultation_id
    )


@router.get(
    "/doctor/consultation/{consultation_id}",
    status_code=status.HTTP_200_OK
)
async def get_feedback_for_doctor(
    consultation_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Doctor views feedback for their case."""
    return await treatment_feedback_service.get_feedback_for_consultation(
        db, consultation_id
    )


@router.get(
    "/admin/all",
    status_code=status.HTTP_200_OK
)
async def get_all_feedback_admin(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin views all treatment feedback."""
    return await treatment_feedback_service.get_all_treatment_feedback(db)


@router.get(
    "/stats",
    status_code=status.HTTP_200_OK
)
async def get_feedback_stats(
    db: AsyncSession = Depends(get_db)
):
    """Public stats — used in landing page and admin dashboard."""
    return await treatment_feedback_service.get_feedback_stats(db)