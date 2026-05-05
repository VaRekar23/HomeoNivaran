import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep",
    "Puducherry", "Dadra and Nagar Haveli"
]

ADDRESS_LABELS = ["Home", "Office", "Parents", "Other"]


class AddressCreate(BaseModel):
    label: str = Field(default="Home", max_length=50)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=10, max_length=20)
    line1: str = Field(min_length=5, max_length=255)
    line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=6, max_length=10)
    is_default: bool = Field(default=False)


class AddressUpdate(BaseModel):
    label: Optional[str] = Field(default=None, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=20)
    line1: Optional[str] = Field(default=None, max_length=255)
    line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    pincode: Optional[str] = Field(default=None, max_length=10)
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    label: str
    full_name: str
    phone: str
    line1: str
    line2: Optional[str]
    city: str
    state: str
    pincode: str
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime