import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
import math


def compute_age(dob: date) -> int:
    """Compute age in years from date of birth."""
    today = date.today()
    years = today.year - dob.year
    # Subtract 1 if birthday hasn't occurred yet this year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return max(0, years)


class FamilyMemberCreate(BaseModel):
    """
    Data sent by patient to add a new family member.
    All required except allergies and notes.
    """
    name: str = Field(min_length=2, max_length=100)
    dob: date = Field(description="Date of birth")
    gender: str = Field(pattern="^(male|female|other)$")
    relation: str = Field(min_length=2, max_length=50)
    known_allergies: Optional[str] = Field(default=None, max_length=500)
    medical_notes: Optional[str] = Field(default=None, max_length=1000)


class FamilyMemberUpdate(BaseModel):
    """
    Data sent to update a family member.
    ALL fields are optional — patient can update just one field if needed.
    """
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    dob: Optional[date] = None
    gender: Optional[str] = Field(default=None, pattern="^(male|female|other)$")
    relation: Optional[str] = Field(default=None, min_length=2, max_length=50)
    known_allergies: Optional[str] = Field(default=None, max_length=500)
    medical_notes: Optional[str] = Field(default=None, max_length=1000)


class FamilyMemberResponse(BaseModel):
    """
    Data returned to the patient.
    Includes all fields including auto-generated ones like id and timestamps.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    dob: date
    age: int = 0
    gender: str
    relation: str
    known_allergies: Optional[str]
    medical_notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FamilyMemberListResponse(BaseModel):
    """Used in list endpoints — includes computed age."""
    id: uuid.UUID
    name: str
    dob: date
    age: int
    gender: str
    relation: str
    known_allergies: Optional[str]
    medical_notes: Optional[str]
    is_active: bool