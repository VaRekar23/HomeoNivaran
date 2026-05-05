import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class OrderResponse(BaseModel):
    """Basic order info returned to patient."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    consultation_id: uuid.UUID
    prescription_id: uuid.UUID
    patient_id: uuid.UUID
    total_amount: float
    payment_status: str
    order_status: str
    courier_name: Optional[str]
    tracking_number: Optional[str]
    dispatched_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime


class OrderDetailResponse(BaseModel):
    """
    Full order detail including prescription summary.
    Used when patient opens a specific order.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    consultation_id: uuid.UUID
    prescription_id: uuid.UUID
    patient_id: uuid.UUID
    total_amount: float
    payment_status: str
    order_status: str
    courier_name: Optional[str]
    tracking_number: Optional[str]
    dispatched_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime

    # Enriched fields
    ailment_name: str
    member_name: str
    doctor_notes: Optional[str]


class DispatchUpdateRequest(BaseModel):
    """Doctor marks order as dispatched with tracking info."""
    courier_name: str = Field(min_length=2, max_length=100)
    tracking_number: str = Field(min_length=2, max_length=150)