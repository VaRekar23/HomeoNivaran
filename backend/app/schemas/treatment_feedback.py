import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TreatmentFeedbackCreate(BaseModel):
    consultation_id:         uuid.UUID
    overall_rating:          int = Field(ge=1, le=5)
    treatment_effectiveness: Optional[int] = Field(
        default=None, ge=1, le=5
    )
    doctor_communication:    Optional[int] = Field(
        default=None, ge=1, le=5
    )
    delivery_experience:     Optional[int] = Field(
        default=None, ge=1, le=5
    )
    feeling_better:          Optional[bool] = None
    would_recommend:         Optional[bool] = None
    comments:                Optional[str] = Field(
        default=None, max_length=1000
    )


class TreatmentFeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:                      uuid.UUID
    consultation_id:         uuid.UUID
    patient_id:              uuid.UUID
    overall_rating:          int
    treatment_effectiveness: Optional[int]
    doctor_communication:    Optional[int]
    delivery_experience:     Optional[int]
    feeling_better:          Optional[bool]
    would_recommend:         Optional[bool]
    comments:                Optional[str]
    is_requested_by_doctor:  bool
    created_at:              datetime