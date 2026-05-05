import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import (
    get_current_user,
    require_doctor,
)
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.ailment import AilmentCreate, AilmentUpdate
from app.services import ailment_service

router = APIRouter(prefix="/ailments", tags=["Ailments"])


# ── Public endpoints (any logged-in user) ──

@router.get("", status_code=status.HTTP_200_OK)
async def list_ailments(
    category:         Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns active ailments. Doctors can request inactive ones."""
    return await ailment_service.get_all_ailments(
        db,
        category=category,
        include_inactive=include_inactive
    )


@router.get("/categories", status_code=status.HTTP_200_OK)
async def list_categories(
    include_inactive: bool = Query(default=False),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await ailment_service.get_ailment_categories(
        db,
        include_inactive=include_inactive
    )


# ── Public ailments (no auth) for landing page ──

@router.get("/public", status_code=status.HTTP_200_OK)
async def list_ailments_public(
    db: AsyncSession = Depends(get_db)
):
    """No auth required — used on landing page."""
    return await ailment_service.get_all_ailments(db)


@router.get("/public/categories", status_code=status.HTTP_200_OK)
async def list_categories_public(
    db: AsyncSession = Depends(get_db)
):
    """No auth required — used on landing page."""
    return await ailment_service.get_ailment_categories(db)


# ── Doctor-only endpoints ──

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ailment(
    data: AilmentCreate,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await ailment_service.create_ailment(
        db, data, current_doctor.id
    )


@router.put("/{ailment_id}", status_code=status.HTTP_200_OK)
async def update_ailment(
    ailment_id: uuid.UUID,
    data: AilmentUpdate,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    return await ailment_service.update_ailment(
        db, ailment_id, data, current_doctor.id
    )


@router.put(
    "/{ailment_id}/toggle",
    status_code=status.HTTP_200_OK
)
async def toggle_ailment(
    ailment_id: uuid.UUID,
    current_doctor: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    """Enable or disable an ailment (soft delete)."""
    return await ailment_service.toggle_ailment(
        db, ailment_id, current_doctor.id
    )