import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Ailment(Base):
    __tablename__ = "ailments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    icon: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        default="HeartPulse"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
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

    consultations: Mapped[list["Consultation"]] = relationship(  # ← ADD THIS
        "Consultation",
        back_populates="ailment"
    )