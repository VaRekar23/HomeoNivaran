import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Numeric
from app.database import Base


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False
    )
    medicine_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    medicine_category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Oral Medicine"
    )
    medicine_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )
    potency: Mapped[str] = mapped_column(
        String(50),
        nullable=True
        # e.g. "30C", "200C", "1M", "10M"
    )
    dosage: Mapped[str] = mapped_column(
        String(100),
        nullable=True
        # e.g. "4 pills", "5 drops"
    )
    frequency: Mapped[str] = mapped_column(
        String(100),
        nullable=False
        # e.g. "3 times a day", "once at night"
    )
    duration: Mapped[str] = mapped_column(
        String(100),
        nullable=False
        # e.g. "7 days", "2 weeks", "1 month"
    )
    instructions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
        # e.g. "Take 30 minutes before meals"
        # e.g. "Avoid coffee and mint while taking this"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship
    prescription: Mapped["Prescription"] = relationship(
        "Prescription",
        back_populates="items"
    )