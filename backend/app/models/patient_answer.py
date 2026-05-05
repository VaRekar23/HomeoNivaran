import uuid
from datetime import datetime
from sqlalchemy import Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PatientAnswer(Base):
    __tablename__ = "patient_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    consultation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("consultations.id", ondelete="CASCADE"),
        nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_questions.id", ondelete="CASCADE"),
        nullable=False
    )
    answer_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    consultation: Mapped["Consultation"] = relationship(
        "Consultation",
        back_populates="answers"
    )
    question: Mapped["AIQuestion"] = relationship(
        "AIQuestion",
        back_populates="answers"
    )