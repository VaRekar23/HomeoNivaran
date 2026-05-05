import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Address(Base):
    __tablename__ = "addresses"

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
    label: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Home"
        # e.g. Home, Office, Parents, Other
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
        # Name of person at delivery address
    )
    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False
        # Contact number at this address
    )
    line1: Mapped[str] = mapped_column(
        String(255),
        nullable=False
        # House/flat/building
    )
    line2: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
        # Street/area/landmark
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    pincode: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
        # Only one address per user can be default
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
        # Soft delete
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

    user: Mapped["User"] = relationship(
        "User",
        back_populates="addresses"
    )