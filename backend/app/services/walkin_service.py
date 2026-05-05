import uuid
import secrets
import string
import logging
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.models.user import User
from app.models.family_member import FamilyMember
from app.models.consultation import Consultation
from app.models.ailment import Ailment
from app.models.ai_question import AIQuestion
from app.models.patient_answer import PatientAnswer
from app.utils.date_utils import compute_age

logger = logging.getLogger(__name__)


class WalkInPatientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None


class WalkInAddressCreate(BaseModel):
    label:     str = "Home"
    full_name: str
    phone:     str
    line1:     str
    line2:     Optional[str] = None
    city:      str
    state:     str
    pincode:   str


class OfflineConsultationCreate(BaseModel):
    patient_id: uuid.UUID
    member_name: str
    member_dob: date
    member_gender: str
    member_relation: str
    member_known_allergies: Optional[str] = None
    ailment_id: uuid.UUID
    qa_pairs: list[dict]
    doctor_notes: Optional[str] = None
    address: Optional[WalkInAddressCreate] = None


def _generate_temp_password(length: int = 12) -> str:
    """Generates a secure random temporary password."""
    chars = string.ascii_letters + string.digits + "!@#$"
    return "".join(secrets.choice(chars) for _ in range(length))


async def create_walkin_patient(
    db: AsyncSession,
    doctor_id: uuid.UUID,
    data: WalkInPatientCreate
) -> dict:
    """
    Creates a new patient account for a walk-in patient.
    The doctor provides basic info — system generates temp password.
    """
    # Check if phone already registered
    phone_check = await db.execute(
        select(User).where(User.phone == data.phone)
    )
    existing_by_phone = phone_check.scalar_one_or_none()

    if existing_by_phone:
        # Patient already exists — return them
        return {
            "id":          existing_by_phone.id,
            "name":        existing_by_phone.name,
            "email":       existing_by_phone.email,
            "phone":       existing_by_phone.phone,
            "already_existed": True,
            "message":     f"Patient '{existing_by_phone.name}' already "
                           f"exists with this phone number."
        }

    # Check email if provided
    if data.email:
        email_check = await db.execute(
            select(User).where(User.email == data.email)
        )
        if email_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists"
            )

    import bcrypt
    temp_password = _generate_temp_password()
    password_hash = bcrypt.hashpw(
        temp_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # Use phone as email if not provided
    email = data.email or f"{data.phone}@walkin.homeonivaran.com"

    patient = User(
        name=data.name,
        email=email,
        phone=data.phone,
        password_hash=password_hash,
        role="patient",
        is_active=True,
    )
    db.add(patient)
    await db.flush()
    await db.refresh(patient)

    logger.info(
        f"Doctor {doctor_id} created walk-in patient: "
        f"{patient.name} ({patient.phone})"
    )

    return {
        "id":              patient.id,
        "name":            patient.name,
        "email":           patient.email,
        "phone":           patient.phone,
        "temp_password":   temp_password,
        "already_existed": False,
        "message":         f"Patient account created. "
                           f"Temp password: {temp_password}"
    }


async def create_offline_consultation(
    db: AsyncSession,
    doctor_id: uuid.UUID,
    data: OfflineConsultationCreate
) -> dict:
    """
    Doctor creates a consultation on behalf of a patient.
    Skips AI questions — doctor fills answers directly.
    Auto-creates family member if needed.
    """
    # Verify patient exists
    patient_result = await db.execute(
        select(User).where(
            User.id == data.patient_id,
            User.role == "patient"
        )
    )
    patient = patient_result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Verify ailment exists
    ailment_result = await db.execute(
        select(Ailment).where(
            Ailment.id == data.ailment_id,
            Ailment.is_active == True
        )
    )
    ailment = ailment_result.scalar_one_or_none()
    if ailment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ailment not found"
        )

    # Find or create family member
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.user_id == data.patient_id,
            FamilyMember.name == data.member_name,
            FamilyMember.relation == data.member_relation,
            FamilyMember.is_active == True
        )
    )
    member = member_result.scalar_one_or_none()

    if member is None:
        member = FamilyMember(
            user_id=data.patient_id,
            name=data.member_name,
            dob=data.member_dob,
            gender=data.member_gender,
            relation=data.member_relation,
            known_allergies=data.member_known_allergies,
        )
        db.add(member)
        await db.flush()
        await db.refresh(member)

    # Create consultation — marked as offline, status = under_review
    # (skip submitted → doctor directly reviews)
    from datetime import datetime, timezone
    consultation = Consultation(
        patient_id=data.patient_id,
        member_id=member.id,
        ailment_id=data.ailment_id,
        status="under_review",
        is_offline=True,
        created_by_doctor_id=doctor_id,
        submitted_at=datetime.now(timezone.utc),
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(consultation)
    await db.flush()
    await db.refresh(consultation)

    # Create Q&A pairs as static questions + answers
    # (no AI generation needed — doctor provides directly)
    saved_questions = []
    for index, pair in enumerate(data.qa_pairs):
        question_text = pair.get("question", "").strip()
        answer_text = pair.get("answer", "").strip()

        if not question_text:
            continue

        question = AIQuestion(
            consultation_id=consultation.id,
            question_text=question_text,
            question_type="text",
            order_index=index
        )
        db.add(question)
        await db.flush()
        await db.refresh(question)

        if answer_text:
            answer = PatientAnswer(
                consultation_id=consultation.id,
                question_id=question.id,
                answer_text=answer_text
            )
            db.add(answer)

        saved_questions.append({
            "question": question_text,
            "answer":   answer_text
        })

    await db.flush()

    # Notify patient
    from app.services.notification_service import create_notification
    await create_notification(
        db=db,
        user_id=data.patient_id,
        type="new_consultation",
        title="Consultation created by your doctor",
        message=(
            f"Your doctor has recorded a consultation for "
            f"{data.member_name}. Prescription will follow shortly."
        ),
        reference_id=consultation.id,
        reference_type="consultation"
    )

    # Save address if provided:
    saved_address_id = None

    if data.address:
        from app.models.address import Address
        from app.services.address_service import _clear_default

        # Set as default for this patient
        await _clear_default(db, data.patient_id)

        address = Address(
            user_id=data.patient_id,
            label=data.address.label,
            full_name=data.address.full_name,
            phone=data.address.phone,
            line1=data.address.line1,
            line2=data.address.line2,
            city=data.address.city,
            state=data.address.state,
            pincode=data.address.pincode,
            is_default=True,
        )
        db.add(address)
        await db.flush()
        await db.refresh(address)
        saved_address_id = address.id

        # Update consultation with address
        consultation.address_id = saved_address_id
        await db.flush()

    logger.info(
        f"Doctor {doctor_id} created offline consultation "
        f"{consultation.id} for patient {data.patient_id}"
    )

    return {
        "id":              consultation.id,
        "patient_id":      data.patient_id,
        "patient_name":    patient.name,
        "member_name":     member.name,
        "ailment_name":    ailment.name,
        "status":          consultation.status,
        "is_offline":      True,
        "qa_count":        len(saved_questions),
        "message":         "Offline consultation created successfully"
    }


async def search_patients(
    db: AsyncSession,
    query: str
) -> list[dict]:
    """
    Search patients by name or phone for doctor to find existing patients.
    """
    from sqlalchemy import or_

    result = await db.execute(
        select(User).where(
            User.role == "patient",
            User.is_active == True,
            or_(
                User.name.ilike(f"%{query}%"),
                User.phone.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%")
            )
        ).limit(10)
    )
    patients = result.scalars().all()

    return [
        {
            "id":    p.id,
            "name":  p.name,
            "phone": p.phone,
            "email": p.email,
        }
        for p in patients
    ]