import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Boolean, DateTime,
    Text, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TreatmentFeedback(Base):
    __tablename__ = "treatment_feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    consultation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("consultations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
        # One feedback per consultation
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True
    )

    # Core ratings
    overall_rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False
        # 1–5 stars
    )
    treatment_effectiveness: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
        # 1–5: How effective was the treatment?
    )
    doctor_communication: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
        # 1–5: How was the doctor's communication?
    )
    delivery_experience: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
        # 1–5: How was the medicine delivery?
    )

    # Qualitative
    feeling_better: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True
        # Are you feeling better after the treatment?
    )
    would_recommend: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True
        # Would you recommend HomeoNivaran?
    )
    comments: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
        # Open-ended feedback
    )

    # Metadata
    is_requested_by_doctor: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
        # True if doctor triggered the request
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )