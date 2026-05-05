import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_patient, require_doctor
from app.models.user import User
from app.schemas.order import OrderDetailResponse, DispatchUpdateRequest
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Get all orders for logged in patient"
)
async def get_my_orders(
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all orders for the logged in patient.
    Most recent first. Includes ailment and member names.
    """
    return await order_service.get_patient_orders(db, current_user.id)


@router.get(
    "/{order_id}",
    status_code=status.HTTP_200_OK,
    summary="Get a specific order with full details"
)
async def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a single order with prescription and tracking info.
    Returns 404 if order doesn't belong to this patient.
    """
    return await order_service.get_order_by_id(
        db, order_id, current_user.id
    )