import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_patient
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.address import AddressCreate, AddressUpdate
from app.services import address_service

router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"]
)


@router.get("", status_code=status.HTTP_200_OK)
async def list_addresses(
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    return await address_service.get_addresses(db, current_user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_address(
    data: AddressCreate,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    return await address_service.create_address(db, current_user.id, data)


@router.put("/{address_id}", status_code=status.HTTP_200_OK)
async def update_address(
    address_id: uuid.UUID,
    data: AddressUpdate,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    return await address_service.update_address(
        db, address_id, current_user.id, data
    )


@router.delete("/{address_id}", status_code=status.HTTP_200_OK)
async def delete_address(
    address_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    return await address_service.delete_address(
        db, address_id, current_user.id
    )


@router.put(
    "/{address_id}/set-default",
    status_code=status.HTTP_200_OK
)
async def set_default(
    address_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    return await address_service.set_default_address(
        db, address_id, current_user.id
    )