import uuid
from datetime import datetime, time
from sqlalchemy import Integer, Boolean, DateTime, ForeignKey, Time, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False
        # 0=Monday, 1=Tuesday, ... 6=Sunday
    )
    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )
    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )
    label: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
        # Optional label e.g. "Morning", "Evening"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    doctor: Mapped["User"] = relationship(
        "User",
        back_populates="availability_slots"
    )