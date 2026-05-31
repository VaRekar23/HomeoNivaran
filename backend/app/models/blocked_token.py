import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class BlockedToken(Base):
    __tablename__ = "blocked_tokens"

    jti: Mapped[uuid.UUID] = mapped_column(
        String(36),
        primary_key=True
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    blocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    __table_args__ = (
        Index(
            "ix_blocked_tokens_expires_at_blocked_at",
            "expires_at",
            "blocked_at"
        ),
    )