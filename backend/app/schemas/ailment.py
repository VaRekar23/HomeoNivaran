import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AilmentCreate(BaseModel):
    """
    Data the doctor sends to create a new ailment.
    Name and category are required.
    """
    name: str = Field(min_length=2, max_length=100)
    category: str = Field(min_length=2, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    icon:        Optional[str] = Field(
        default="HeartPulse",
        max_length=100,
        description="Lucide React icon name e.g. HeartPulse, Leaf"
    )


class AilmentUpdate(BaseModel):
    """
    Data the doctor sends to update an ailment.
    All fields optional — doctor can update just one field.
    """
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    category: Optional[str] = Field(default=None, min_length=2, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    icon:        Optional[str] = Field(default=None, max_length=100)
    is_active:   Optional[bool] = None


class AilmentResponse(BaseModel):
    """
    Data returned to the client.
    Patients see this when selecting what to consult for.
    Doctor sees this when managing ailments.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    description: Optional[str]
    icon: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AilmentCategoryResponse(BaseModel):
    """
    Used for the categories endpoint.
    Returns distinct category names with their ailment counts.
    """
    category: str
    icon: Optional[str]
    ailment_count: int