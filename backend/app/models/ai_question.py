import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AIQuestion(Base):
    __tablename__ = "ai_questions"

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
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(
        Enum(
            "text",
            "yes_no",
            "mcq",
            "scale",
            name="question_type_enum"
        ),
        nullable=False
    )
    options: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
        # Stores MCQ options as JSON array
        # e.g. ["Morning", "Evening", "Both", "All day"]
    )
    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False
        # Ensures questions are always displayed in the correct order
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship
    consultation: Mapped["Consultation"] = relationship(
        "Consultation",
        back_populates="questions"
    )
    answers: Mapped[list["PatientAnswer"]] = relationship(
        "PatientAnswer",
        back_populates="question",
        cascade="all, delete-orphan"
    )