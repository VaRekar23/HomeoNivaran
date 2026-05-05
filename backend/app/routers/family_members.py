import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_patient
from app.models.user import User
from app.schemas.family_member import (
    FamilyMemberCreate,
    FamilyMemberUpdate,
    FamilyMemberResponse
)
from app.services import family_service

router = APIRouter(prefix="/family-members", tags=["Family Members"])


@router.get(
    "/",
    response_model=list[FamilyMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all family members"
)
async def get_all_members(
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all family members for the logged in patient.
    Each patient only sees their own family members.
    """
    return await family_service.get_all_members(db, current_user.id)


@router.post(
    "/",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new family member"
)
async def create_member(
    data: FamilyMemberCreate,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Adds a new family member for the logged in patient.
    Use relation = 'self' when the patient is booking for themselves.
    """
    return await family_service.create_member(db, current_user.id, data)


@router.get(
    "/{member_id}",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a specific family member"
)
async def get_member(
    member_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a single family member by ID.
    Returns 404 if not found or doesn't belong to this patient.
    """
    return await family_service.get_member_by_id(db, member_id, current_user.id)


@router.put(
    "/{member_id}",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a family member"
)
async def update_member(
    member_id: uuid.UUID,
    data: FamilyMemberUpdate,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates a family member's details.
    Only send the fields you want to change.
    """
    return await family_service.update_member(db, member_id, current_user.id, data)


@router.delete(
    "/{member_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a family member"
)
async def delete_member(
    member_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a family member permanently.
    Returns 404 if not found or doesn't belong to this patient.
    """
    await family_service.delete_member(db, member_id, current_user.id)
    return {"message": "Family member deleted successfully"}