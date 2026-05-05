import uuid
from datetime import time, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

DAYS = [
    "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday"
]


class AvailabilitySlotCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    label: Optional[str] = Field(default=None, max_length=100)

    model_config = ConfigDict(json_encoders={time: lambda t: t.strftime("%H:%M")})


class AvailabilitySlotUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None


class AvailabilitySlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    doctor_id: uuid.UUID
    day_of_week: int
    day_name: str = ""
    start_time: time
    end_time: time
    label: Optional[str]
    is_active: bool
    created_at: datetime