import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status

from app.models.ailment import Ailment
from app.schemas.ailment import AilmentCreate, AilmentUpdate

logger = logging.getLogger(__name__)


def _ailment_to_dict(ailment: Ailment) -> dict:
    return {
        "id":          ailment.id,
        "name":        ailment.name,
        "category":    ailment.category,
        "description": ailment.description,
        "icon":        ailment.icon or "HeartPulse",
        "is_active":   ailment.is_active,
        "created_at":  ailment.created_at,
        "updated_at":  ailment.updated_at,
    }


async def get_all_ailments(
    db: AsyncSession,
    category:         str | None = None,
    include_inactive: bool = False,
) -> list[dict]:
    query = select(Ailment)

    conditions = []
    if not include_inactive:
        conditions.append(Ailment.is_active == True)
    if category:
        conditions.append(Ailment.category == category)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(
        Ailment.category.asc(),
        Ailment.name.asc()
    )

    result = await db.execute(query)
    return [_ailment_to_dict(a) for a in result.scalars().all()]


async def get_ailment_categories(
    db: AsyncSession,
    include_inactive: bool = False
) -> list[dict]:
    """
    Returns distinct categories with count and icon.
    Icon is taken from the first ailment in that category.
    """
    query = select(
        Ailment.category,
        func.count(Ailment.id).label("ailment_count"),
        # Grab the icon from any ailment in this category
        func.min(Ailment.icon).label("icon")
    )

    if not include_inactive:
        query = query.where(Ailment.is_active == True)

    query = query.group_by(Ailment.category).order_by(
        Ailment.category.asc()
    )

    result = await db.execute(query)
    return [
        {
            "category":     row.category,
            "icon":         row.icon or "HeartPulse",
            "ailment_count": row.ailment_count,
        }
        for row in result
    ]


async def create_ailment(
    db: AsyncSession,
    data: AilmentCreate,
    doctor_id: uuid.UUID
) -> dict:
    """
    Creates a new ailment.
    Checks for duplicates within the same category.
    """
    existing = await db.execute(
        select(Ailment).where(
            Ailment.name == data.name,
            Ailment.category == data.category,
        )
    )
    existing_ailment = existing.scalar_one_or_none()

    if existing_ailment:
        if existing_ailment.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ailment '{data.name}' already exists "
                       f"in category '{data.category}'"
            )
        else:
            # Reactivate soft-deleted ailment
            existing_ailment.is_active   = True
            existing_ailment.description = data.description
            existing_ailment.icon        = data.icon or "HeartPulse"
            await db.flush()
            await db.refresh(existing_ailment)
            logger.info(
                f"Ailment '{data.name}' reactivated by doctor {doctor_id}"
            )
            return _ailment_to_dict(existing_ailment)

    ailment = Ailment(
        name=data.name,
        category=data.category,
        description=data.description,
        icon=data.icon or "HeartPulse",
    )
    db.add(ailment)
    await db.flush()
    await db.refresh(ailment)

    logger.info(
        f"Ailment '{ailment.name}' created by doctor {doctor_id}"
    )
    return _ailment_to_dict(ailment)


async def update_ailment(
    db: AsyncSession,
    ailment_id: uuid.UUID,
    data: AilmentUpdate,
    doctor_id: uuid.UUID
) -> dict:
    result = await db.execute(
        select(Ailment).where(Ailment.id == ailment_id)
    )
    ailment = result.scalar_one_or_none()

    if ailment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ailment not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ailment, field, value)

    await db.flush()
    await db.refresh(ailment)

    action = "disabled" if data.is_active is False else "updated"
    logger.info(
        f"Ailment '{ailment.name}' {action} by doctor {doctor_id}"
    )
    return _ailment_to_dict(ailment)


async def toggle_ailment(
    db: AsyncSession,
    ailment_id: uuid.UUID,
    doctor_id: uuid.UUID
) -> dict:
    """Toggle ailment active/inactive status (soft delete)."""
    result = await db.execute(
        select(Ailment).where(Ailment.id == ailment_id)
    )
    ailment = result.scalar_one_or_none()

    if ailment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ailment not found"
        )

    # Check if any active consultations use this ailment
    if ailment.is_active:
        from app.models.consultation import Consultation
        active_consults = await db.scalar(
            select(func.count(Consultation.id)).where(
                Consultation.ailment_id == ailment_id,
                Consultation.status.in_(["submitted", "under_review"])
            )
        )
        if active_consults and active_consults > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot disable '{ailment.name}' — "
                       f"{active_consults} active consultation(s) use it. "
                       f"Wait for them to be completed."
            )

    ailment.is_active = not ailment.is_active
    await db.flush()
    await db.refresh(ailment)

    action = "activated" if ailment.is_active else "disabled"
    logger.info(
        f"Ailment '{ailment.name}' {action} by doctor {doctor_id}"
    )
    return {
        **_ailment_to_dict(ailment),
        "message": f"Ailment '{ailment.name}' {action} successfully"
    }