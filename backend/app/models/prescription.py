import uuid
from datetime import datetime
from sqlalchemy import Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Numeric
from app.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    consultation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("consultations.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True
        # unique=True enforces one prescription per consultation
        # at the database level — not just application level
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    doctor_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    ai_suggestion: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
        # Stores the AI suggestions at the time of prescription
        # Even if AI changes later, we preserve what was suggested
        # This is an audit trail — important for medical records
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
        # Doctor sets the price when writing the prescription
    )
    consultation_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
        # Consultation fee portion
    )
    delivery_charges: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
        # Delivery charges portion
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    consultation: Mapped["Consultation"] = relationship(
        "Consultation",
        back_populates="prescription"
    )
    doctor: Mapped["User"] = relationship(
        "User",
        back_populates="prescriptions"
    )
    items: Mapped[list["PrescriptionItem"]] = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionItem.created_at"
    )
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="prescription",
        uselist=False
        # uselist=False means this is a one-to-one relationship
        # prescription.order returns a single Order, not a list
    )