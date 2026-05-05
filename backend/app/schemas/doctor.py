import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class QueueItemResponse(BaseModel):
    """
    A single row in the doctor's queue list.
    Shows just enough info to decide which case to open next.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    submitted_at: datetime

    # Patient info
    patient_name: str
    patient_email: str
    patient_phone: str

    # Member info (who the consultation is for)
    member_name: str
    member_age: int
    member_gender: str
    member_relation: str

    # Ailment info
    ailment_name: str
    ailment_category: str


class QAItem(BaseModel):
    """
    A single question + patient's answer pair.
    Shown inside the case review page.
    """
    question_text: str
    question_type: str
    answer_text: Optional[str] = None
    # answer is Optional because patient might not have answered yet
    # (edge case: doctor opens case before patient submits answers)
    order_index: int


class CaseReviewAddressResponse(BaseModel):
    label:     str = "Home"
    full_name: str
    phone:     str
    line1:     str
    line2:     Optional[str] = None
    city:      str
    state:     str
    pincode:   str


class CaseReviewResponse(BaseModel):
    """
    Full case detail shown when doctor opens a specific consultation.
    Everything the doctor needs to make a prescription decision.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime]

    # Patient details
    patient_id: uuid.UUID
    patient_name: str
    patient_email: str
    patient_phone: str
    is_offline: bool
    delivery_address: CaseReviewAddressResponse | None = None

    # Member details (who the consultation is for)
    member_id: uuid.UUID
    member_name: str
    member_age: int
    member_gender: str
    member_relation: str
    member_known_allergies: Optional[str]
    member_medical_notes: Optional[str]

    # Ailment details
    ailment_id: uuid.UUID
    ailment_name: str
    ailment_category: str
    ailment_description: Optional[str]

    # All Q&A joined together — ordered by question sequence
    qa_pairs: list[QAItem]


class UpdateStatusRequest(BaseModel):
    """
    Body for updating consultation status.
    Doctor moves cases through the workflow manually.
    """
    status: str

    # Valid transitions (enforced in service layer):
    # submitted       → under_review
    # under_review    → prescription_added (done via prescription endpoint)
    # prescription_added → closed (done via payment endpoint)


class AISummaryResponse(BaseModel):
    """Response from AI patient summarizer."""
    consultation_id: uuid.UUID
    summary: str


class AIMedicineItem(BaseModel):
    """A single medicine suggestion from AI."""
    medicine: str
    potency: str
    dosage: str
    frequency: str
    reason: str


class AIMedicineSuggestionResponse(BaseModel):
    """Response from AI medicine suggester."""
    consultation_id: uuid.UUID
    suggestions: list[AIMedicineItem]
    disclaimer: str