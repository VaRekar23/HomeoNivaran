import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate

logger = logging.getLogger(__name__)


def _address_to_dict(address: Address) -> dict:
    return {
        "id": address.id,
        "user_id": address.user_id,
        "label": address.label,
        "full_name": address.full_name,
        "phone": address.phone,
        "line1": address.line1,
        "line2": address.line2,
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "is_default": address.is_default,
        "is_active": address.is_active,
        "created_at": address.created_at,
        "updated_at": address.updated_at,
    }


async def get_addresses(
    db: AsyncSession,
    user_id: uuid.UUID
) -> list[dict]:
    result = await db.execute(
        select(Address).where(
            Address.user_id == user_id,
            Address.is_active == True
        ).order_by(
            Address.is_default.desc(),
            Address.created_at.asc()
        )
    )
    return [_address_to_dict(a) for a in result.scalars().all()]


async def create_address(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: AddressCreate
) -> dict:
    # If setting as default, unset existing default
    if data.is_default:
        await _clear_default(db, user_id)

    # If first address, auto-set as default
    existing = await db.execute(
        select(Address).where(
            Address.user_id == user_id,
            Address.is_active == True
        )
    )
    is_first = len(existing.scalars().all()) == 0

    address = Address(
        user_id=user_id,
        label=data.label,
        full_name=data.full_name,
        phone=data.phone,
        line1=data.line1,
        line2=data.line2,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        is_default=data.is_default or is_first,
    )
    db.add(address)
    await db.flush()
    await db.refresh(address)
    return _address_to_dict(address)


async def update_address(
    db: AsyncSession,
    address_id: uuid.UUID,
    user_id: uuid.UUID,
    data: AddressUpdate
) -> dict:
    result = await db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == user_id,
            Address.is_active == True
        )
    )
    address = result.scalar_one_or_none()

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    # Handle default switching
    if update_data.get("is_default"):
        await _clear_default(db, user_id)

    for field, value in update_data.items():
        setattr(address, field, value)

    await db.flush()
    await db.refresh(address)
    return _address_to_dict(address)


async def delete_address(
    db: AsyncSession,
    address_id: uuid.UUID,
    user_id: uuid.UUID
) -> dict:
    result = await db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == user_id,
            Address.is_active == True
        )
    )
    address = result.scalar_one_or_none()

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    address.is_active = False

    # If deleted was default, set next available as default
    if address.is_default:
        next_result = await db.execute(
            select(Address).where(
                Address.user_id == user_id,
                Address.is_active == True,
                Address.id != address_id
            ).limit(1)
        )
        next_address = next_result.scalar_one_or_none()
        if next_address:
            next_address.is_default = True

    await db.flush()
    return {"message": "Address removed successfully"}


async def set_default_address(
    db: AsyncSession,
    address_id: uuid.UUID,
    user_id: uuid.UUID
) -> dict:
    await _clear_default(db, user_id)

    result = await db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == user_id,
            Address.is_active == True
        )
    )
    address = result.scalar_one_or_none()

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    address.is_default = True
    await db.flush()
    return _address_to_dict(address)


async def _clear_default(
    db: AsyncSession,
    user_id: uuid.UUID
) -> None:
    """Removes default flag from all addresses for this user."""
    result = await db.execute(
        select(Address).where(
            Address.user_id == user_id,
            Address.is_default == True,
            Address.is_active == True
        )
    )
    for address in result.scalars().all():
        address.is_default = False
    await db.flush()