import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException, status

from app.models.consultation import Consultation
from app.models.ai_question import AIQuestion
from app.models.family_member import FamilyMember
from app.models.ailment import Ailment
from app.schemas.consultation import ConsultationCreate
from app.ai.question_generator import generate_questions_with_cache
from app.models.patient_answer import PatientAnswer
from app.schemas.patient_answer import SubmitAnswersRequest
from app.utils.date_utils import compute_age

logger = logging.getLogger(__name__)


async def create_consultation(
    db: AsyncSession,
    patient_id: uuid.UUID,
    data: ConsultationCreate
) -> dict:
    # Step 1 — Verify member belongs to this patient
    member_result = await db.execute(
        select(FamilyMember).where(
            FamilyMember.id == data.member_id,
            FamilyMember.user_id == patient_id
        )
    )
    member = member_result.scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family member not found"
        )

    # Step 2 — Verify ailment exists and is active
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
            detail="Ailment not found or is no longer available"
        )
    
    # Verify address belongs to this patient
    from app.models.address import Address
    addr_result = await db.execute(
        select(Address).where(
            Address.id == data.address_id,
            Address.user_id == patient_id,
            Address.is_active == True
        )
    )
    if addr_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid address selected"
        )

    # Step 3 — Create consultation record
    consultation = Consultation(
        patient_id=patient_id,
        member_id=data.member_id,
        ailment_id=data.ailment_id,
        address_id=data.address_id,
        status="submitted"
    )
    
    db.add(consultation)
    await db.flush()
    # flush sends the INSERT to DB and gives us the generated UUID
    # but doesn't commit yet — everything is still in one transaction

    # Step 4 — Generate AI questions
    # We pass member details so AI can tailor questions to age and gender
    logger.info(
        f"Generating AI questions for consultation {consultation.id} "
        f"ailment='{ailment.name}' age={compute_age(member.dob)} gender={member.gender}"
    )

    ai_questions = await generate_questions_with_cache(
        db = db,
        patient_id=patient_id,
        consultation_id=consultation.id,
        ailment_name=ailment.name,
        ailment_id=ailment.id,
        age=compute_age(member.dob) if member and member.dob else 0,
        gender=member.gender,
        known_allergies=member.known_allergies if member else None
    )

    # Step 5 — Save questions to DB
    saved_questions = []
    for index, q in enumerate(ai_questions):
        question = AIQuestion(
            consultation_id=consultation.id,
            question_text=q["question"],
            question_type=q["type"],
            options=q["options"] if q["options"] else None,
            order_index=index
        )
        db.add(question)
        saved_questions.append(question)

    await db.flush()

    # Refresh to get all DB-generated values
    await db.refresh(consultation)
    for q in saved_questions:
        await db.refresh(q)

    # Step 6 — Build and return the response dict
    # We build this manually because the response combines data
    # from multiple models (consultation + member + ailment + questions)
    return {
        "id": consultation.id,
        "patient_id": consultation.patient_id,
        "member_id": consultation.member_id,
        "ailment_id": consultation.ailment_id,
        "status": consultation.status,
        "submitted_at": consultation.submitted_at,
        "member_name": member.name,
        "ailment_name": ailment.name,
        "is_offline": getattr(consultation, "is_offline", False),
        "questions": [
            {
                "id": q.id,
                "consultation_id": q.consultation_id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "order_index": q.order_index
            }
            for q in saved_questions
        ]
    }


async def get_patient_consultations(
    db: AsyncSession,
    patient_id: uuid.UUID
) -> list[dict]:
    """
    Returns all consultations for a patient with human-readable names.
    Most recent first.
    """
    result = await db.execute(
        select(Consultation).where(
            Consultation.patient_id == patient_id
        ).order_by(Consultation.submitted_at.desc())
    )
    consultations = result.scalars().all()

    # For each consultation, fetch related member and ailment names
    output = []
    for c in consultations:
        member_result = await db.execute(
            select(FamilyMember).where(FamilyMember.id == c.member_id)
        )
        member = member_result.scalar_one_or_none()

        ailment_result = await db.execute(
            select(Ailment).where(Ailment.id == c.ailment_id)
        )
        ailment = ailment_result.scalar_one_or_none()

        answer_result = await db.execute(
            select(PatientAnswer).where(PatientAnswer.consultation_id == c.id)
        )
        answers = answer_result.scalars().all()
        has_answers = len(answers) > 0

        output.append({
            "id": c.id,
            "status": c.status,
            "submitted_at": c.submitted_at,
            "member_name": member.name if member else "Unknown",
            "ailment_name": ailment.name if ailment else "Unknown",
            "ailment_category": ailment.category if ailment else "Unknown",
            "has_answers": has_answers
        })

    return output


async def get_consultation_by_id(
    db: AsyncSession,
    consultation_id: uuid.UUID,
    patient_id: uuid.UUID
) -> dict:
    """
    Returns a single consultation with full details.
    Verifies the consultation belongs to this patient.
    """
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.patient_id == patient_id
        )
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Fetch related data
    member_result = await db.execute(
        select(FamilyMember).where(FamilyMember.id == consultation.member_id)
    )
    member = member_result.scalar_one_or_none()

    ailment_result = await db.execute(
        select(Ailment).where(Ailment.id == consultation.ailment_id)
    )
    ailment = ailment_result.scalar_one_or_none()

    address_data = None
    if consultation.address_id:
        from app.models.address import Address
        addr_result = await db.execute(
            select(Address).where(Address.id == consultation.address_id)
        )
        addr = addr_result.scalar_one_or_none()
        if addr:
            address_data = {
                "id":        addr.id,
                "label":     addr.label,
                "full_name": addr.full_name,
                "phone":     addr.phone,
                "line1":     addr.line1,
                "line2":     addr.line2,
                "city":      addr.city,
                "state":     addr.state,
                "pincode":   addr.pincode,
            }

    # Fetch questions ordered by order_index
    questions_result = await db.execute(
        select(AIQuestion).where(
            AIQuestion.consultation_id == consultation_id
        ).order_by(AIQuestion.order_index.asc())
    )
    questions = questions_result.scalars().all()

    # Fetch ALL answers for this consultation
    answers_result = await db.execute(
        select(PatientAnswer).where(
            PatientAnswer.consultation_id == consultation_id
        )
    )
    answers = answers_result.scalars().all()

    answer_map = {
        str(a.question_id): a.answer_text
        for a in answers
    }

    return {
        "id": consultation.id,
        "patient_id": consultation.patient_id,
        "member_id": consultation.member_id,
        "ailment_id": consultation.ailment_id,
        "status": consultation.status,
        "submitted_at": consultation.submitted_at,
        "member_name": member.name if member else "Unknown",
        "ailment_name": ailment.name if ailment else "Unknown",
        "address": address_data,
        "is_offline": getattr(consultation, "is_offline", False),
        "questions": [
            {
                "id": q.id,
                "consultation_id": q.consultation_id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "order_index": q.order_index,
                "answer_text": answer_map.get(str(q.id))
            }
            for q in questions
        ]
    }

async def submit_answers(
    db: AsyncSession,
    consultation_id: uuid.UUID,
    patient_id: uuid.UUID,
    data: SubmitAnswersRequest
) -> dict:
    """
    Saves the patient's answers to all questions.

    Steps:
    1. Verify consultation exists and belongs to this patient
    2. Verify consultation is still in 'submitted' status
    3. Verify all question_ids belong to this consultation
    4. Delete any previous answers (allow resubmission)
    5. Save all new answers
    6. Return saved answers with confirmation

    Note: We do NOT change consultation status here.
    Status changes to 'under_review' when the doctor
    opens the case — not when patient submits answers.
    This way doctor sees it in the queue as 'submitted'
    which means "patient has answered, ready for review."
    """

    # Step 1 — Verify consultation ownership
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.patient_id == patient_id
        )
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Step 2 — Check consultation is in the right status
    # Patient can only submit answers when status is 'submitted'
    # Once doctor starts review, answers are locked
    if consultation.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit answers. Consultation is "
                   f"already '{consultation.status}'. "
                   f"Please contact the doctor if you need to make changes."
        )

    # Step 3 — Verify all submitted question_ids belong to this consultation
    # This prevents a malicious user from submitting answers
    # for questions from someone else's consultation
    questions_result = await db.execute(
        select(AIQuestion).where(
            AIQuestion.consultation_id == consultation_id
        )
    )
    valid_questions = questions_result.scalars().all()
    valid_question_ids = {q.id for q in valid_questions}

    # Check each submitted question_id is valid
    submitted_question_ids = {a.question_id for a in data.answers}
    invalid_ids = submitted_question_ids - valid_question_ids

    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid question IDs submitted: "
                   f"{[str(i) for i in invalid_ids]}"
        )

    # Step 4 — Delete any previous answers
    # This allows the patient to resubmit if they made mistakes
    # As long as consultation is still in 'submitted' status
    await db.execute(
        delete(PatientAnswer).where(
            PatientAnswer.consultation_id == consultation_id
        )
    )
    await db.flush()

    # Step 5 — Save all new answers
    saved_answers = []
    for answer_item in data.answers:
        answer = PatientAnswer(
            consultation_id=consultation_id,
            question_id=answer_item.question_id,
            answer_text=answer_item.answer_text.strip()
            # .strip() removes accidental leading/trailing whitespace
        )
        db.add(answer)
        saved_answers.append(answer)

    await db.flush()

    # Refresh all saved answers to get DB-generated values
    for answer in saved_answers:
        await db.refresh(answer)

    logger.info(
        f"Patient {patient_id} submitted {len(saved_answers)} answers "
        f"for consultation {consultation_id}"
    )

    # Step 6 — Return confirmation
    return {
        "consultation_id": consultation_id,
        "status": consultation.status,
        "message": f"Successfully submitted {len(saved_answers)} answers. "
                   f"The doctor will review your case shortly.",
        "answers": [
            {
                "id": a.id,
                "consultation_id": a.consultation_id,
                "question_id": a.question_id,
                "answer_text": a.answer_text,
                "answered_at": a.answered_at
            }
            for a in saved_answers
        ]
    }


async def get_consultation_pending_answers(
    db: AsyncSession,
    consultation_id: uuid.UUID,
    patient_id: uuid.UUID
) -> dict:
    """
    Returns consultation with questions that have no answers yet.
    Used to check if patient still needs to answer questions.
    """
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.patient_id == patient_id,
            Consultation.status == "submitted"
        )
    )
    consultation = result.scalar_one_or_none()

    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found or not in submitted state"
        )

    questions_result = await db.execute(
        select(AIQuestion).where(
            AIQuestion.consultation_id == consultation_id
        ).order_by(AIQuestion.order_index.asc())
    )
    questions = questions_result.scalars().all()

    answers_result = await db.execute(
        select(PatientAnswer).where(
            PatientAnswer.consultation_id == consultation_id
        )
    )
    answers = answers_result.scalars().all()
    answer_map = {str(a.question_id): a.answer_text for a in answers}

    unanswered = [
        q for q in questions
        if not answer_map.get(str(q.id))
    ]

    return {
        "id":              consultation.id,
        "has_answers":     len(answers) > 0,
        "unanswered_count": len(unanswered),
        "questions": [
            {
                "id":            q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options":       q.options,
                "order_index":   q.order_index,
                "answer_text":   answer_map.get(str(q.id))
            }
            for q in questions
        ]
    }