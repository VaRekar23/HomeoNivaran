import uuid
from datetime import datetime, time, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.doctor_availability import DoctorAvailability
from app.schemas.availability import AvailabilitySlotCreate, AvailabilitySlotUpdate

DAYS = [
    "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday"
]


def _slot_to_dict(slot: DoctorAvailability) -> dict:
    return {
        "id":           slot.id,
        "doctor_id":    slot.doctor_id,
        "day_of_week":  slot.day_of_week,
        "day_name":     DAYS[slot.day_of_week],
        "start_time":   slot.start_time.strftime("%H:%M"),
        "end_time":     slot.end_time.strftime("%H:%M"),
        "label":        slot.label,
        "is_active":    slot.is_active,
        "created_at":   slot.created_at,
    }


async def get_doctor_availability(
    db: AsyncSession,
    doctor_id: uuid.UUID
) -> list[dict]:
    result = await db.execute(
        select(DoctorAvailability).where(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.is_active == True
        ).order_by(
            DoctorAvailability.day_of_week.asc(),
            DoctorAvailability.start_time.asc()
        )
    )
    return [_slot_to_dict(s) for s in result.scalars().all()]


async def get_public_availability(
    db: AsyncSession
) -> dict:
    """
    Returns availability for all doctors.
    Used on patient side — doesn't need doctor_id.
    Also checks if any slot is currently active (doctor online now).
    """
    from app.models.user import User
    doctors_result = await db.execute(
        select(User).where(
            User.role == "doctor",
            User.is_active == True
        )
    )
    doctors = doctors_result.scalars().all()

    now = datetime.now()
    today_dow = now.weekday()   # 0=Monday
    current_time = now.time()

    result = []
    for doctor in doctors:
        slots_result = await db.execute(
            select(DoctorAvailability).where(
                DoctorAvailability.doctor_id == doctor.id,
                DoctorAvailability.is_active == True
            ).order_by(
                DoctorAvailability.day_of_week.asc(),
                DoctorAvailability.start_time.asc()
            )
        )
        slots = slots_result.scalars().all()

        # Check if doctor is available right now
        is_available_now = any(
            s.day_of_week == today_dow and
            s.start_time <= current_time <= s.end_time
            for s in slots
        )

        # Find next available slot
        today_remaining = [
            s for s in slots
            if s.day_of_week == today_dow and
            s.start_time > current_time
        ]
        future_days = [
            s for s in slots
            if s.day_of_week > today_dow
        ]
        wrap_around = [
            s for s in slots
            if s.day_of_week < today_dow
        ]
        next_slot = (
            today_remaining or future_days or wrap_around or []
        )

        result.append({
            "doctor_id":        doctor.id,
            "doctor_name":      doctor.name,
            "doctor_phone":     doctor.phone,
            "is_available_now": is_available_now,
            "slots":            [_slot_to_dict(s) for s in slots],
            "next_slot":        _slot_to_dict(next_slot[0])
                                if next_slot else None,
        })

    return result


async def create_slot(
    db: AsyncSession,
    doctor_id: uuid.UUID,
    data: AvailabilitySlotCreate
) -> dict:
    if data.end_time <= data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )

    slot = DoctorAvailability(
        doctor_id=doctor_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        label=data.label,
    )
    db.add(slot)
    await db.flush()
    await db.refresh(slot)
    return _slot_to_dict(slot)


async def update_slot(
    db: AsyncSession,
    slot_id: uuid.UUID,
    doctor_id: uuid.UUID,
    data: AvailabilitySlotUpdate
) -> dict:
    result = await db.execute(
        select(DoctorAvailability).where(
            DoctorAvailability.id == slot_id,
            DoctorAvailability.doctor_id == doctor_id
        )
    )
    slot = result.scalar_one_or_none()

    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Availability slot not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(slot, field, value)

    await db.flush()
    await db.refresh(slot)
    return _slot_to_dict(slot)


async def delete_slot(
    db: AsyncSession,
    slot_id: uuid.UUID,
    doctor_id: uuid.UUID
) -> dict:
    result = await db.execute(
        select(DoctorAvailability).where(
            DoctorAvailability.id == slot_id,
            DoctorAvailability.doctor_id == doctor_id
        )
    )
    slot = result.scalar_one_or_none()

    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slot not found"
        )

    await db.delete(slot)
    await db.flush()
    return {"message": "Availability slot removed"}