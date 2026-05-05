from email.headerregistry import Address
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("patient", "doctor", "admin", name="user_role"),
        default="patient",
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    profile_pic_url: Mapped[str | None] = mapped_column(String, nullable=True)
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
    family_members: Mapped[list["FamilyMember"]] = relationship(
        "FamilyMember",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    consultations: Mapped[list["Consultation"]] = relationship(
        "Consultation",
        back_populates="patient",
        cascade="all, delete-orphan",
        foreign_keys="Consultation.patient_id"
    )
    prescriptions: Mapped[list["Prescription"]] = relationship(
        "Prescription",
        back_populates="doctor"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="patient"
    )
    feedbacks: Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates="user"
        # No cascade — feedback survives user deletion (SET NULL)
    )
    addresses: Mapped[list["Address"]] = relationship(
        "Address",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Address.created_at"
    )
    availability_slots: Mapped[list["DoctorAvailability"]] = relationship(
        "DoctorAvailability",
        back_populates="doctor",
        cascade="all, delete-orphan"
    )