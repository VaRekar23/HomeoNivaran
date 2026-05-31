import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.consultation import Consultation
from app.models.ai_question import AIQuestion
from app.models.patient_answer import PatientAnswer
from app.models.user import User
from app.models.family_member import FamilyMember
from app.models.ailment import Ailment
from app.schemas.doctor import UpdateStatusRequest
from app.ai.summarizer import summarize_patient
from app.ai.medicine_suggester import suggest_medicines
from app.utils.date_utils import compute_age

logger = logging.getLogger(__name__)

# Valid status transitions — enforced strictly
# Key = current status, Value = allowed next statuses
VALID_TRANSITIONS = {
    "submitted":          ["under_review"],
    "under_review":       ["prescription_added"],
    "prescription_added": ["closed"],
    "closed":             []  # terminal state — no further transitions
}


async def get_consultation_queue(
    db: AsyncSession,
    status_filter: str | None = None,
    ailment_id: str | None = None,
) -> list[dict]:
    """
    Returns all consultations for the doctor's queue.
    Joined with patient, member and ailment details.
    Ordered by most recently submitted first.

    Optional filters:
    - status_filter: show only consultations with this status
    - ailment_id: show only consultations for this ailment
    """
    query = select(Consultation).order_by(
        Consultation.submitted_at.desc()
    )

    if status_filter:
        # Validate status value before querying
        valid_statuses = [
            "submitted", "under_review", "prescription_added", "closed"
        ]
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter. "
                       f"Valid values: {valid_statuses}"
            )
        query = query.where(Consultation.status == status_filter)

    if ailment_id:
        try:
            ailment_uuid = uuid.UUID(ailment_id)
            query = query.where(Consultation.ailment_id == ailment_uuid)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ailment_id format"
            )

    result = await db.execute(query)
    consultations = result.scalars().all()

    # Build rich queue items by fetching related data for each consultation
    queue = []
    for c in consultations:

        # Fetch patient
        patient_result = await db.execute(
            select(User).where(User.id == c.patient_id)
        )
        patient = patient_result.scalar_one_or_none()

        # Fetch member (use any status — show even deactivated members)
        member_result = await db.execute(
            select(FamilyMember).where(FamilyMember.id == c.member_id)
        )
        member = member_result.scalar_one_or_none()

        # Fetch ailment
        ailment_result = await db.execute(
            select(Ailment).where(Ailment.id == c.ailment_id)
        )
        ailment = ailment_result.scalar_one_or_none()

        queue.append({
            "id":               c.id,
            "status":           c.status,
            "submitted_at":     c.submitted_at,
            "patient_name":     patient.name if patient else "Unknown",
            "patient_email":    patient.email if patient else "Unknown",
            "patient_phone":    patient.phone if patient else "Unknown",
            "member_name":      member.name if member else "Unknown",
            "member_age":       compute_age(member.dob) if member and member.dob else 0,
            "member_gender":    member.gender if member else "Unknown",
            "member_relation":  member.relation if member else "Unknown",
            "ailment_name":     ailment.name if ailment else "Unknown",
            "ailment_category": ailment.category if ailment else "Unknown",
        })

    return queue


async def get_case_detail(
    db: AsyncSession,
    consultation_id: uuid.UUID
) -> dict:
    """
    Returns full case details for doctor review.
    Includes patient info, member info, ailment info,
    and all Q&A pairs joined together.

    Also automatically moves status from 'submitted' to 'under_review'
    when the doctor opens the case for the first time.
    """

    # Fetch consultation
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Auto-advance status: submitted → under_review
    # This happens the moment the doctor opens the case
    # It signals: "doctor has seen this and is reviewing"
    if consultation.status == "submitted":
        consultation.status = "under_review"
        consultation.reviewed_at = datetime.now(timezone.utc)
        await db.flush()
        logger.info(
            f"Consultation {consultation_id} moved to under_review "
            f"(doctor opened the case)"
        )

    # Fetch related records
    patient_result = await db.execute(
        select(User).where(User.id == consultation.patient_id)
    )
    patient = patient_result.scalar_one_or_none()

    member_result = await db.execute(
        select(FamilyMember).where(FamilyMember.id == consultation.member_id)
    )
    member = member_result.scalar_one_or_none()

    ailment_result = await db.execute(
        select(Ailment).where(Ailment.id == consultation.ailment_id)
    )
    ailment = ailment_result.scalar_one_or_none()

    address_data = None
    print("Consultation address_id:", consultation.address_id)
    if consultation.address_id:
        print("Fetching address for consultation:", consultation.id)
        from app.models.address import Address
        addr_result = await db.execute(
            select(Address).where(Address.id == consultation.address_id)
        )
        addr = addr_result.scalar_one_or_none()
        if addr:
            address_data = {
                "label":    addr.label,
                "full_name":addr.full_name,
                "phone":    addr.phone,
                "line1":    addr.line1,
                "line2":    addr.line2,
                "city":     addr.city,
                "state":    addr.state,
                "pincode":  addr.pincode,
            }

    # Fetch questions ordered by sequence
    questions_result = await db.execute(
        select(AIQuestion)
        .where(AIQuestion.consultation_id == consultation_id)
        .order_by(AIQuestion.order_index.asc())
    )
    questions = questions_result.scalars().all()

    # Fetch all answers for this consultation
    answers_result = await db.execute(
        select(PatientAnswer).where(
            PatientAnswer.consultation_id == consultation_id
        )
    )
    answers = answers_result.scalars().all()

    # Build answer lookup: question_id → answer_text
    # This makes it O(1) to find each question's answer
    answer_map = {a.question_id: a.answer_text for a in answers}

    # Join questions with their answers
    qa_pairs = []
    for q in questions:
        qa_pairs.append({
            "question_text": q.question_text,
            "question_type": q.question_type,
            "answer_text":   answer_map.get(q.id),
            # .get() returns None if no answer found — handled gracefully
            "order_index":   q.order_index
        })

    return {
        "id":                    consultation.id,
        "status":                consultation.status,
        "submitted_at":          consultation.submitted_at,
        "reviewed_at":           consultation.reviewed_at,
        "patient_id":            consultation.patient_id,
        "patient_name":          patient.name if patient else "Unknown",
        "patient_email":         patient.email if patient else "Unknown",
        "patient_phone":         patient.phone if patient else "Unknown",
        "member_id":             consultation.member_id,
        "member_name":           member.name if member else "Unknown",
        "member_age":            compute_age(member.dob) if member and member.dob else 0,
        "member_dob":            str(member.dob) if member and member.dob else None,
        "member_gender":         member.gender if member else "Unknown",
        "member_relation":       member.relation if member else "Unknown",
        "member_known_allergies": member.known_allergies if member else None,
        "member_medical_notes":  member.medical_notes if member else None,
        "ailment_id":            consultation.ailment_id,
        "ailment_name":          ailment.name if ailment else "Unknown",
        "ailment_category":      ailment.category if ailment else "Unknown",
        "ailment_description":   ailment.description if ailment else None,
        "delivery_address": address_data,
        "is_offline": getattr(consultation, "is_offline", False),
        "qa_pairs":              qa_pairs
    }


async def update_consultation_status(
    db: AsyncSession,
    consultation_id: uuid.UUID,
    data: UpdateStatusRequest
) -> dict:
    """
    Manually updates consultation status.
    Enforces valid transitions only.

    Note: some transitions happen automatically:
    - submitted → under_review (when doctor opens case)
    - prescription_added → closed (when payment confirmed)

    This endpoint handles manual overrides if needed.
    """
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    current_status = consultation.status
    new_status = data.status

    # Validate the transition
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition. "
                   f"Cannot move from '{current_status}' to '{new_status}'. "
                   f"Allowed transitions from '{current_status}': {allowed}"
        )

    # Apply the status change
    consultation.status = new_status

    # Set timestamps for specific transitions
    if new_status == "under_review" and not consultation.reviewed_at:
        consultation.reviewed_at = datetime.now(timezone.utc)

    if new_status == "closed":
        consultation.closed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(consultation)

    logger.info(
        f"Consultation {consultation_id} status changed: "
        f"'{current_status}' → '{new_status}'"
    )

    return {
        "id":           consultation.id,
        "status":       consultation.status,
        "reviewed_at":  consultation.reviewed_at,
        "closed_at":    consultation.closed_at
    }


async def get_ai_summary(
    db: AsyncSession,
    consultation_id: uuid.UUID
) -> dict:
    """
    Generates an AI summary of the patient case for the doctor.
    Fetches Q&A from DB and passes to AI summarizer.
    """
    # Fetch consultation
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Fetch member and ailment
    member_result = await db.execute(
        select(FamilyMember).where(FamilyMember.id == consultation.member_id)
    )
    member = member_result.scalar_one_or_none()

    ailment_result = await db.execute(
        select(Ailment).where(Ailment.id == consultation.ailment_id)
    )
    ailment = ailment_result.scalar_one_or_none()

    # Fetch Q&A pairs
    questions_result = await db.execute(
        select(AIQuestion)
        .where(AIQuestion.consultation_id == consultation_id)
        .order_by(AIQuestion.order_index.asc())
    )
    questions = questions_result.scalars().all()

    answers_result = await db.execute(
        select(PatientAnswer).where(
            PatientAnswer.consultation_id == consultation_id
        )
    )
    answers = answers_result.scalars().all()
    answer_map = {a.question_id: a.answer_text for a in answers}

    # Build Q&A pairs list for the AI
    qa_pairs = [
        {
            "question": q.question_text,
            "answer": answer_map.get(q.id, "No answer provided")
        }
        for q in questions
    ]

    # Call AI summarizer
    summary = await summarize_patient(
        db=db,
        user_id=consultation.patient_id,
        consultation_id=consultation.id,
        ailment_name=ailment.name if ailment else "Unknown",
        age=compute_age(member.dob) if member and member.dob else 0,
        gender=member.gender if member else "Unknown",
        qa_pairs=qa_pairs
    )

    return {
        "consultation_id": consultation_id,
        "summary": summary
    }


async def get_ai_medicine_suggestions(
    db: AsyncSession,
    consultation_id: uuid.UUID
) -> dict:
    """
    Generates AI medicine suggestions for the doctor.
    First generates a patient summary, then uses it for medicine suggestions.
    """
    # Fetch consultation
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    member_result = await db.execute(
        select(FamilyMember).where(FamilyMember.id == consultation.member_id)
    )
    member = member_result.scalar_one_or_none()

    ailment_result = await db.execute(
        select(Ailment).where(Ailment.id == consultation.ailment_id)
    )
    ailment = ailment_result.scalar_one_or_none()

    # Build Q&A for summary
    questions_result = await db.execute(
        select(AIQuestion)
        .where(AIQuestion.consultation_id == consultation_id)
        .order_by(AIQuestion.order_index.asc())
    )
    questions = questions_result.scalars().all()

    answers_result = await db.execute(
        select(PatientAnswer).where(
            PatientAnswer.consultation_id == consultation_id
        )
    )
    answers = answers_result.scalars().all()
    answer_map = {a.question_id: a.answer_text for a in answers}

    qa_pairs = [
        {
            "question": q.question_text,
            "answer": answer_map.get(q.id, "No answer provided")
        }
        for q in questions
    ]

    # Generate summary first — medicine suggestions are based on it
    patient_summary = await summarize_patient(
        db=db,
        user_id=consultation.patient_id,
        consultation_id=consultation.id,
        ailment_name=ailment.name if ailment else "Unknown",
        age=compute_age(member.dob) if member and member.dob else 0,
        gender=member.gender if member else "Unknown",
        qa_pairs=qa_pairs
    )

    # Generate medicine suggestions
    suggestions = await suggest_medicines(
        db=db,
        user_id=consultation.patient_id,
        consultation_id=consultation.id,
        ailment_name=ailment.name if ailment else "Unknown",
        patient_summary=patient_summary
    )

    return {
        "consultation_id": consultation_id,
        "suggestions": suggestions,
        "disclaimer": (
            "These are AI-generated suggestions only. "
            "The doctor must review and make the final prescription decision."
        )
    }


async def get_patient_consultation_history(
    db: AsyncSession,
    patient_id: uuid.UUID,
    exclude_consultation_id: uuid.UUID,
    limit: int = 5
) -> list[dict]:
    """
    Returns recent past consultations for a patient.
    Shown on doctor's case review page for context.
    Excludes the current consultation.
    """
    result = await db.execute(
        select(Consultation).where(
            Consultation.patient_id == patient_id,
            Consultation.id != exclude_consultation_id,
            Consultation.status.in_(["prescription_added", "closed"])
        ).order_by(
            Consultation.submitted_at.desc()
        ).limit(limit)
    )
    consultations = result.scalars().all()

    history = []
    for c in consultations:
        ailment_res = await db.execute(
            select(Ailment).where(Ailment.id == c.ailment_id)
        )
        ailment = ailment_res.scalar_one_or_none()
        history.append({
            "id":           c.id,
            "ailment_name": ailment.name if ailment else "Unknown",
            "status":       c.status,
            "submitted_at": c.submitted_at,
        })
    return history