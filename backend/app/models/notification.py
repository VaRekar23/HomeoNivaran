import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
        # e.g. "prescription_ready", "payment_received",
        #      "order_dispatched", "new_consultation"
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
        # Points to the related record — e.g. order_id or consultation_id
        # Lets frontend navigate to the right page on click
    )
    reference_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
        # e.g. "order", "consultation", "prescription"
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="notifications"
    )