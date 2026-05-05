from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,       # Logs SQL queries in development
    pool_pre_ping=True,        # Checks connection health before using
    pool_size=10,
    max_overflow=20,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,    # Keeps objects accessible after commit
    autocommit=False,
    autoflush=False,
)


# Base class all models will inherit from
class Base(DeclarativeBase):
    pass