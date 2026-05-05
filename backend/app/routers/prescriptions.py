import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_doctor, require_patient, get_current_user
from app.models.user import User
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionResponse,
    PrescriptionUpdateRequest
)
from app.services import prescription_service
from app.services import consultation_service

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@router.post(
    "/",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a prescription (Doctor only)"
)
async def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Doctor creates a prescription for a consultation.
    This also automatically creates an order and notifies the patient.

    Requirements:
    - Consultation must be in 'under_review' status
    - No existing prescription for this consultation
    - At least one medicine must be included
    """
    return await prescription_service.create_prescription(
        db, current_user.id, data
    )


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a prescription by ID (Doctor only)"
)
async def get_prescription(
    prescription_id: uuid.UUID,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Returns a prescription by its ID."""
    return await prescription_service.get_prescription_by_id(
        db, prescription_id
    )


@router.put(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a prescription (Doctor only, before payment)"
)
async def update_prescription(
    prescription_id: uuid.UUID,
    data: PrescriptionUpdateRequest,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates a prescription.
    Only allowed before the patient has paid.
    """
    return await prescription_service.update_prescription(
        db, prescription_id, current_user.id, data
    )