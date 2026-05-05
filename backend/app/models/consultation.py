import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("family_members.id", ondelete="RESTRICT"),
        nullable=False
    )
    ailment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ailments.id", ondelete="RESTRICT"),
        # RESTRICT = don't allow deleting an ailment
        # that has consultations attached to it
        nullable=False
    )
    address_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("addresses.id", ondelete="SET NULL"),
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        Enum(
            "submitted",
            "under_review",
            "prescription_added",
            "closed",
            name="consultation_status"
        ),
        default="submitted",
        nullable=False
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    is_offline: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
        # True = created by doctor on behalf of patient
    )
    created_by_doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
        # Doctor who created this offline consultation
    )

    # Relationships
    patient: Mapped["User"] = relationship(
        "User",
        back_populates="consultations",
        foreign_keys=[patient_id]
    )
    member: Mapped["FamilyMember"] = relationship(
        "FamilyMember",
        back_populates="consultations"
    )
    ailment: Mapped["Ailment"] = relationship(
        "Ailment",
        back_populates="consultations"
    )
    questions: Mapped[list["AIQuestion"]] = relationship(
        "AIQuestion",
        back_populates="consultation",
        cascade="all, delete-orphan",
        order_by="AIQuestion.order_index"
    )
    answers: Mapped[list["PatientAnswer"]] = relationship(
        "PatientAnswer",
        back_populates="consultation",
        cascade="all, delete-orphan"
    )
    prescription: Mapped["Prescription"] = relationship(
        "Prescription",
        back_populates="consultation",
        uselist=False
        # uselist=False = one-to-one
        # consultation.prescription returns single object not list
    )
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="consultation",
        uselist=False
    )
    