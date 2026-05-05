from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status
import uuid

from app.models.family_member import FamilyMember
from app.schemas.family_member import FamilyMemberCreate, FamilyMemberUpdate
from app.utils.date_utils import compute_age


def _member_to_dict(member: FamilyMember) -> dict:
    """
    Converts a FamilyMember ORM object to a plain dict.
    Computes age dynamically from dob — age is NOT stored in DB.
    Called by every function that returns member data.
    """
    return {
        "id":              member.id,
        "user_id":         member.user_id,
        "name":            member.name,
        "dob":             member.dob.isoformat() if member.dob else None,
        "age":             compute_age(member.dob),
        "gender":          member.gender,
        "relation":        member.relation,
        "known_allergies": member.known_allergies,
        "medical_notes":   member.medical_notes,
        "is_active":       member.is_active,
        "created_at":      member.created_at,
        "updated_at":      member.updated_at,
    }


async def get_all_members(
    db: AsyncSession,
    user_id: uuid.UUID
) -> list[dict]:
    """
    Returns all active family members belonging to this patient.
    Returns list of dicts with computed age.
    """
    result = await db.execute(
        select(FamilyMember)
        .where(and_(
            FamilyMember.user_id == user_id,
            FamilyMember.is_active == True
        ))
        .order_by(FamilyMember.created_at.asc())
    )
    members = result.scalars().all()
    return [_member_to_dict(m) for m in members]
    # ↑ This is the key line — convert every ORM object to dict


async def get_member_by_id(
    db: AsyncSession,
    member_id: uuid.UUID,
    user_id: uuid.UUID
) -> FamilyMember:
    """
    Returns a single FamilyMember ORM object.
    Used internally by update/delete — they need the ORM object.
    Verifies the member belongs to this patient.
    """
    result = await db.execute(
        select(FamilyMember).where(
            and_(
                FamilyMember.id == member_id,
                FamilyMember.user_id == user_id,
                FamilyMember.is_active == True
            )
        )
    )
    member = result.scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family member not found"
        )

    return member


async def get_member_by_id_as_dict(
    db: AsyncSession,
    member_id: uuid.UUID,
    user_id: uuid.UUID
) -> dict:
    """
    Returns a single family member as a dict with computed age.
    Used by router endpoints that return member data to client.
    """
    member = await get_member_by_id(db, member_id, user_id)
    return _member_to_dict(member)


async def get_member_by_id_regardless_of_status(
    db: AsyncSession,
    member_id: uuid.UUID
) -> FamilyMember | None:
    """
    Returns a family member ORM object regardless of is_active status.
    Used INTERNALLY when displaying consultation history — we still
    want to show the member's name even if they've been deactivated.
    """
    result = await db.execute(
        select(FamilyMember).where(FamilyMember.id == member_id)
    )
    return result.scalar_one_or_none()


async def create_member(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: FamilyMemberCreate
) -> dict:
    """
    Creates a new family member for this patient.
    Prevents duplicate name+relation combinations.
    Returns dict with computed age.
    """
    # Check for duplicate: same user, same name, same relation
    existing_result = await db.execute(
        select(FamilyMember).where(
            and_(
                FamilyMember.user_id == user_id,
                FamilyMember.name == data.name,
                FamilyMember.relation == data.relation
            )
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A family member named '{data.name}' with "
                       f"relation '{data.relation}' already exists"
            )
        else:
            # Previously soft-deleted — reactivate with new details
            existing.is_active = True
            existing.dob = data.dob        # ← store dob, not age
            existing.gender = data.gender
            existing.known_allergies = data.known_allergies
            existing.medical_notes = data.medical_notes
            await db.flush()
            await db.refresh(existing)
            return _member_to_dict(existing)   # ← return dict

    new_member = FamilyMember(
        user_id=user_id,
        name=data.name,
        dob=data.dob,                      # ← store dob, not age
        gender=data.gender,
        relation=data.relation,
        known_allergies=data.known_allergies,
        medical_notes=data.medical_notes
    )

    db.add(new_member)
    await db.flush()
    await db.refresh(new_member)

    return _member_to_dict(new_member)     # ← return dict


async def update_member(
    db: AsyncSession,
    member_id: uuid.UUID,
    user_id: uuid.UUID,
    data: FamilyMemberUpdate
) -> dict:
    """
    Updates a family member's details.
    Only updates fields that were explicitly sent (partial update).
    Returns dict with recomputed age from updated dob.
    """
    member = await get_member_by_id(db, member_id, user_id)

    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update"
        )

    for field, value in update_data.items():
        setattr(member, field, value)
        # If dob is updated, age is automatically recomputed
        # in _member_to_dict — nothing extra needed here

    await db.flush()
    await db.refresh(member)

    return _member_to_dict(member)         # ← return dict


async def delete_member(
    db: AsyncSession,
    member_id: uuid.UUID,
    user_id: uuid.UUID
) -> None:
    """
    Soft deletes a family member by setting is_active=False.
    Member and all their consultation history is preserved.
    """
    member = await get_member_by_id(db, member_id, user_id)
    member.is_active = False
    await db.flush()