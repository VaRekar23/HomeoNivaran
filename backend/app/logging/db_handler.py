import logging
import traceback
import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import settings


class DatabaseLogHandler(logging.Handler):
    """
    Custom Python logging handler that writes CRITICAL logs to the database.

    How Python logging works:
    - You call logger.critical("something broke")
    - Python finds all handlers registered for that logger
    - Each handler's emit() method is called with the log record
    - This handler writes the record to the DB

    Fallback behavior:
    - If DB write fails for any reason, falls back to stderr
    - App continues running — logging never crashes the app
    """

    def __init__(self):
        super().__init__(level=logging.CRITICAL)
        # Only handle CRITICAL level — this is set at handler level
        # Even if someone calls this with a lower level log,
        # Python's logging framework will filter it out

        # Create a dedicated engine for logging
        # Separate from the main app engine so logging works
        # even if the main DB session is in a broken state
        self._engine = create_async_engine(
            settings.database_url,
            pool_size=2,         # small pool — logging doesn't need many connections
            max_overflow=2,
            pool_pre_ping=True,
            echo=False           # never echo SQL for logging engine
        )
        self._session_factory = async_sessionmaker(
            bind=self._engine,
            expire_on_commit=False
        )

    def emit(self, record: logging.LogRecord):
        """
        Called by Python logging framework for each log record.
        emit() must be synchronous (Python logging requirement)
        so we schedule the async DB write correctly.
        """
        try:
            # Get the running event loop if one exists
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're inside an async context (FastAPI request)
                # Schedule the coroutine as a task
                asyncio.ensure_future(self._write_to_db(record))
            else:
                # No event loop running (startup, scripts)
                # Run synchronously
                loop.run_until_complete(self._write_to_db(record))
        except Exception:
            # Never crash the app due to logging failure
            self.handleError(record)

    async def _write_to_db(self, record: logging.LogRecord):
        """
        Writes the log record to the database.
        Falls back to stderr if anything goes wrong.
        """
        from app.models.log import Log

        try:
            # Extract traceback if exception info is available
            tb_text = None
            if record.exc_info:
                tb_text = "".join(
                    traceback.format_exception(*record.exc_info)
                )

            async with self._session_factory() as session:
                log_entry = Log(
                    level=record.levelname,
                    message=record.getMessage(),
                    module=record.module,
                    function_name=record.funcName,
                    line_number=record.lineno,
                    traceback=tb_text,
                    # request_url and user_id are set by middleware
                    # when available (see logging_middleware.py)
                    request_url=getattr(record, "request_url", None),
                    request_method=getattr(record, "request_method", None),
                    user_id=getattr(record, "user_id", None),
                    created_at=datetime.now(timezone.utc)
                )
                session.add(log_entry)
                await session.commit()

            # ── Send Telegram alert after successful DB write ──
            from app.services.telegram_service import (
                send_telegram_alert,
                format_critical_alert
            )
            alert_message = format_critical_alert(
                message=record.getMessage(),
                module=record.module,
                function_name=record.funcName,
                line_number=record.lineno,
                request_url=getattr(record, "request_url", None),
                request_method=getattr(record, "request_method", None),
                traceback=tb_text,
            )
            await send_telegram_alert(alert_message)

        except Exception as e:
            # DB write failed — fall back to stderr
            # This ensures we never lose the log completely
            import sys
            print(
                f"[DB LOG FALLBACK] Failed to write to DB: {e}\n"
                f"Original log: [{record.levelname}] {record.getMessage()}",
                file=sys.stderr
            )