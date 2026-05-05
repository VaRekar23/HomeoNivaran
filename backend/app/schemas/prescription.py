import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ── Category options the doctor selects ──
MEDICINE_CATEGORIES = [
    "Oral Medicine",
    "Topical Cream",
    "Hair Oil",
    "Hair Shampoo",
    "Face Wash",
    "Eye Drops",
    "Nasal Drops",
    "Ear Drops",
    "Syrup",
    "Supplement",
    "Other",
]


class PrescriptionItemCreate(BaseModel):
    """A single medicine in the prescription."""
    medicine_name: str = Field(min_length=2, max_length=150)
    medicine_category: str = Field(
        default="Oral Medicine",
        description="Category shown to patient before payment"
    )
    medicine_price: float = Field(
        default=0,
        ge=0,
        description="Price of this specific medicine"
    )
    potency: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Required for oral medicines, drops, syrups"
    )
    dosage: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Dosage amount — optional for topical products"
    )
    frequency: str = Field(min_length=1, max_length=100)
    duration: str = Field(min_length=1, max_length=100)
    instructions: Optional[str] = Field(default=None, max_length=500)


class PrescriptionCreate(BaseModel):
    """
    Data the doctor sends to create a prescription.
    Includes medicines, notes, AI suggestions for audit, and price.
    """
    consultation_id: uuid.UUID
    doctor_notes: Optional[str] = Field(default=None, max_length=2000)
    ai_suggestion: Optional[dict] = None
    # Doctor can optionally save the AI suggestions alongside
    # their prescription for audit trail purposes
    total_amount: float = Field(gt=0, description="Total price in INR")
    consultation_fee: float = Field(
        default=0,
        ge=0,
        description="Consultation fee portion of total"
    )
    delivery_charges: float = Field(
        default=0,
        ge=0,
        description="Delivery charges portion of total"
    )
    medicines: list[PrescriptionItemCreate] = Field(
        min_length=1,
        description="At least one medicine must be prescribed"
    )


class PrescriptionItemResponse(BaseModel):
    """A single medicine item returned in the response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medicine_name: str
    medicine_category: str
    medicine_price: float
    potency: Optional[str]
    dosage: Optional[str]
    frequency: str
    duration: str
    instructions: Optional[str]
    created_at: datetime


class PrescriptionItemMasked(BaseModel):
    """
    Shown to patient BEFORE payment.
    Category only — no medicine name, potency, or dosage.
    """
    id: uuid.UUID
    medicine_category: str
    medicine_price: float


class PrescriptionMasked(BaseModel):
    """
    Prescription summary shown before payment.
    Protects medicine names until payment is confirmed.
    """
    id: uuid.UUID
    consultation_fee: float
    delivery_charges: float
    medicines_total: float
    total_amount: float
    item_count: int
    items_masked: list[PrescriptionItemMasked]
    is_paid: bool = False
    order_id: Optional[str] = None


class PrescriptionResponse(BaseModel):
    """Full prescription returned to doctor or patient."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    consultation_id: uuid.UUID
    doctor_id: uuid.UUID
    doctor_notes: Optional[str]
    total_amount: float
    consultation_fee: float
    delivery_charges: float
    is_paid: bool = False
    #medicines_total: float
    created_at: datetime
    updated_at: datetime
    items: list[PrescriptionItemResponse]


class PrescriptionUpdateRequest(BaseModel):
    """
    Doctor can update prescription ONLY before patient pays.
    Once order is paid, prescription is locked.
    """
    doctor_notes: Optional[str] = Field(default=None, max_length=2000)
    total_amount: Optional[float] = Field(default=None, gt=0)
    consultation_fee: Optional[float] = Field(default=None, ge=0)
    delivery_charges: Optional[float] = Field(default=None, ge=0)
    medicines: Optional[list[PrescriptionItemCreate]] = Field(
        default=None,
        min_length=1
    )