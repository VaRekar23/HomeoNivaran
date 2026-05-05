import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Enum, Text, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class FamilyMember(Base):
    __tablename__ = "family_members"

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
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    dob: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )
    gender: Mapped[str] = mapped_column(
        Enum("male", "female", "other", name="gender_enum"),
        nullable=False
    )
    relation: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    known_allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    medical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(         # ← NEW
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

    # Relationship — lets you do family_member.user to get the User object
    user: Mapped["User"] = relationship("User", back_populates="family_members")
    consultations: Mapped[list["Consultation"]] = relationship(  # ← ADD THIS
        "Consultation",
        back_populates="member"
    )