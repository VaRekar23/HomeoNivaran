import uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Numeric
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True
        # One payment record per order
    )
    razorpay_order_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
        # The ID Razorpay assigns to this payment attempt
    )
    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
        # Filled after successful payment — comes from Razorpay callback
    )
    razorpay_signature: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
        # The HMAC signature from Razorpay — used to verify payment
    )
    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        Enum(
            "pending",
            "success",
            "failed",
            "refunded",
            name="payment_record_status_enum"
        ),
        default="pending",
        nullable=False
    )
    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationship
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="payment"
    )