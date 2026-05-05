import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Log(Base):
    __tablename__ = "logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    level: Mapped[str] = mapped_column(
        String(20),
        nullable=False
        # "CRITICAL" — only this level stored in DB
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    module: Mapped[str | None] = mapped_column(String(200), nullable=True)
    function_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    line_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    traceback: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    request_method: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
        # No FK constraint — user might not exist when error occurs
        # Also avoids cascade issues
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )