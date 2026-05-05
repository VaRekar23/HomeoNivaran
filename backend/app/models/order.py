from email.headerregistry import Address
import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Numeric
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

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
        # One order per consultation — enforced at DB level
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True
        # One order per prescription — enforced at DB level
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    payment_status: Mapped[str] = mapped_column(
        Enum(
            "pending",
            "success",
            "failed",
            "refunded",
            name="payment_status_enum"
        ),
        default="pending",
        nullable=False
    )
    order_status: Mapped[str] = mapped_column(
        Enum(
            "awaiting_payment",
            "paid",
            "processing",
            "dispatched",
            "delivered",
            name="order_status_enum"
        ),
        default="awaiting_payment",
        nullable=False
    )
    courier_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )
    tracking_number: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )
    dispatched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    address_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("addresses.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    consultation: Mapped["Consultation"] = relationship(
        "Consultation",
        back_populates="order"
    )
    prescription: Mapped["Prescription"] = relationship(
        "Prescription",
        back_populates="order"
    )
    patient: Mapped["User"] = relationship(
        "User",
        back_populates="orders"
    )
    payment: Mapped["Payment"] = relationship(
        "Payment",
        back_populates="order",
        uselist=False
    )
    address: Mapped["Address"] = relationship(
        "Address",
        foreign_keys=[address_id]
    )