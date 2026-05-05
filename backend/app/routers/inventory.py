import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_doctor, require_admin
from app.dependencies.db import get_db
from app.models.user import User
from app.services.inventory_service import (
    InventoryCreate,
    InventoryUpdate,
    StockAdjustment,
    get_all_inventory,
    get_inventory_stats,
    create_inventory_item,
    update_inventory_item,
    adjust_stock,
    get_stock_movements,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])

# Allow both doctor and admin to manage inventory
def require_doctor_or_admin(
    current_user: User = Depends(require_doctor)
) -> User:
    return current_user


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats(
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await get_inventory_stats(db)


@router.get("", status_code=status.HTTP_200_OK)
async def list_inventory(
    include_inactive: bool = Query(default=False),
    low_stock_only:   bool = Query(default=False),
    category:         Optional[str] = Query(default=None),
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await get_all_inventory(
        db,
        include_inactive=include_inactive,
        low_stock_only=low_stock_only,
        category=category,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_item(
    data: InventoryCreate,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await create_inventory_item(db, current_user.id, data)


@router.put("/{item_id}", status_code=status.HTTP_200_OK)
async def update_item(
    item_id: uuid.UUID,
    data: InventoryUpdate,
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await update_inventory_item(db, item_id, data)


@router.post(
    "/{item_id}/adjust",
    status_code=status.HTTP_200_OK
)
async def adjust_item_stock(
    item_id: uuid.UUID,
    data: StockAdjustment,
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await adjust_stock(db, item_id, current_user.id, data)


@router.get(
    "/{item_id}/movements",
    status_code=status.HTTP_200_OK
)
async def get_movements(
    item_id: uuid.UUID,
    limit: int = Query(default=20, le=100),
    _: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await get_stock_movements(db, item_id, limit)