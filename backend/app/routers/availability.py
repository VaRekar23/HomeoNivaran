import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_doctor, require_patient
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.availability import AvailabilitySlotCreate, AvailabilitySlotUpdate
from app.services import availability_service

router = APIRouter(tags=["Availability"])


# ── Doctor endpoints ──

@router.get(
    "/doctor/availability",
    status_code=status.HTTP_200_OK,
    summary="Get own availability slots (Doctor)"
)
async def get_my_availability(
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await availability_service.get_doctor_availability(
        db, current_doctor.id
    )


@router.post(
    "/doctor/availability",
    status_code=status.HTTP_201_CREATED,
    summary="Add availability slot (Doctor)"
)
async def add_slot(
    data: AvailabilitySlotCreate,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await availability_service.create_slot(
        db, current_doctor.id, data
    )


@router.put(
    "/doctor/availability/{slot_id}",
    status_code=status.HTTP_200_OK,
    summary="Update availability slot (Doctor)"
)
async def update_slot(
    slot_id: uuid.UUID,
    data: AvailabilitySlotUpdate,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await availability_service.update_slot(
        db, slot_id, current_doctor.id, data
    )


@router.delete(
    "/doctor/availability/{slot_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove availability slot (Doctor)"
)
async def delete_slot(
    slot_id: uuid.UUID,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await availability_service.delete_slot(
        db, slot_id, current_doctor.id
    )


# ── Patient / Public endpoint ──

@router.get(
    "/availability",
    status_code=status.HTTP_200_OK,
    summary="Get all doctors availability (Patient)"
)
async def get_availability(
    db: AsyncSession = Depends(get_db)
):
    return await availability_service.get_public_availability(db)