import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_patient
from app.models.user import User
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationWithQuestionsResponse,
    ConsultationListResponse,
)
from app.schemas.patient_answer import (
    SubmitAnswersRequest,
    SubmitAnswersResponse
)
from app.services import consultation_service
from app.schemas.prescription import PrescriptionResponse
from app.services import prescription_service

router = APIRouter(prefix="/consultations", tags=["Consultations"])


@router.post(
    "/",
    response_model=ConsultationWithQuestionsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new consultation"
)
async def create_consultation(
    data: ConsultationCreate,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Starts a new consultation for a family member.
    Immediately generates AI clinical questions based on the ailment.

    The patient receives the consultation details + questions in one response.
    They then answer these questions and submit via POST /consultations/{id}/answers
    """
    result = await consultation_service.create_consultation(
        db, current_user.id, data
    )
    return result


@router.get(
    "/",
    response_model=list[ConsultationListResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all consultations for logged in patient"
)
async def get_consultations(
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all consultations for the logged in patient.
    Most recent first.
    """
    return await consultation_service.get_patient_consultations(
        db, current_user.id
    )


@router.get(
    "/{consultation_id}",
    response_model=ConsultationWithQuestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a specific consultation with questions"
)
async def get_consultation(
    consultation_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a single consultation with all its AI questions.
    Used when patient wants to review or re-answer questions.
    """
    return await consultation_service.get_consultation_by_id(
        db, consultation_id, current_user.id
    )

@router.post(
    "/{consultation_id}/answers",
    response_model=SubmitAnswersResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit answers to consultation questions"
)
async def submit_answers(
    consultation_id: uuid.UUID,
    data: SubmitAnswersRequest,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits patient's answers to all AI-generated questions.

    Rules:
    - Consultation must belong to this patient
    - Consultation must still be in 'submitted' status
    - All question_ids must belong to this consultation
    - Resubmission is allowed while status is still 'submitted'
    - Once doctor starts review, answers are locked
    """
    result = await consultation_service.submit_answers(
        db, consultation_id, current_user.id, data
    )
    return result

@router.get(
    "/{consultation_id}/prescription",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get prescription for a consultation (Patient)"
)
async def get_my_prescription(
    consultation_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Patient views their prescription for a specific consultation.
    Returns 404 if prescription is not ready yet.
    """
    # First verify the consultation belongs to this patient
    consultation = await consultation_service.get_consultation_by_id(
        db, consultation_id, current_user.id
    )

    return await prescription_service.get_prescription_by_consultation(
        db, consultation_id
    )


@router.get(
    "/{consultation_id}/questions",
    status_code=status.HTTP_200_OK,
    summary="Get consultation questions for answering (Patient)"
)
async def get_questions_for_answering(
    consultation_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    from app.services.consultation_service import (
        get_consultation_pending_answers
    )
    
    return await get_consultation_pending_answers(
        db, consultation_id, current_user.id
    )