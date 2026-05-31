import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Which AI feature was used
    feature: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
        # "question_generation" | "case_summary" |
        # "medicine_suggestion"
    )

    # Model details
    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="claude-sonnet-4-20250514"
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="anthropic"
    )

    # Token counts (from API response)
    prompt_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    completion_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    total_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    # Cost calculation
    cost_usd: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0
        # Calculated from token counts × model pricing
    )

    # Cache info
    was_cached: Mapped[bool] = mapped_column(
        nullable=False,
        default=False
        # True if served from Redis cache (no AI call made)
    )

    # Duration
    duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
        # How long the AI call took in milliseconds
    )

    # Context
    consultation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("consultations.id", ondelete="SET NULL"),
        nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        index=True
    )