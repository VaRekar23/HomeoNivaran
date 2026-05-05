import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ConsultationCreate(BaseModel):
    """
    Data patient sends to start a new consultation.
    Just two IDs — who is this for, and what ailment.
    """
    member_id: uuid.UUID
    ailment_id: uuid.UUID
    address_id: uuid.UUID


class ConsultationResponse(BaseModel):
    """
    Basic consultation info returned after creation.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    member_id: uuid.UUID
    ailment_id: uuid.UUID
    status: str
    submitted_at: datetime


class AIQuestionResponse(BaseModel):
    """
    A single AI-generated question returned to the patient.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    consultation_id: uuid.UUID
    question_text: str
    question_type: str
    options: Optional[list] = None
    order_index: int
    answer_text: Optional[str] = None


class ConsultationAddressResponse(BaseModel):
    label:     str = "Home"
    full_name: str
    phone:     str
    line1:     str
    line2:     Optional[str] = None
    city:      str
    state:     str
    pincode:   str


class ConsultationWithQuestionsResponse(BaseModel):
    """
    Full response after creating a consultation.
    Contains the consultation details AND the AI-generated questions.
    Patient sees this immediately after starting a consultation.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    member_id: uuid.UUID
    ailment_id: uuid.UUID
    status: str
    submitted_at: datetime
    member_name: str
    ailment_name: str
    is_offline: bool
    address: ConsultationAddressResponse | None = None
    questions: list[AIQuestionResponse]


class ConsultationListResponse(BaseModel):
    """
    Used when listing all consultations for a patient.
    Includes human-readable names instead of just IDs.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    submitted_at: datetime
    member_name: str
    ailment_name: str
    ailment_category: str
    has_answers: bool = False