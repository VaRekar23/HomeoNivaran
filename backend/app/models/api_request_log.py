import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class APIRequestLog(Base):
    __tablename__ = "api_request_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Request details
    method: Mapped[str] = mapped_column(
        String(10),
        nullable=False
        # GET, POST, PUT, DELETE
    )
    path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True
        # e.g. /api/consultations
        # Normalized — strip UUIDs from path
    )
    status_code: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True
    )
    duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    # User context
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    user_role: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
        # patient | doctor | admin | None (unauthenticated)
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
        # IPv4 or IPv6
    )

    # Flags
    is_error: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
        # True if status >= 400
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        index=True
    )