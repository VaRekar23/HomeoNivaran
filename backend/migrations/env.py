import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# ── Import your app's settings and Base ──
from app.config import settings
from app.database import Base

# ── Import ALL models here so Alembic can detect them ──
# Add new models here as you create them
import app.models
from app.models.user import User
from app.models.family_member import FamilyMember

# ── Alembic Config object ──
config = context.config

# ── Set DB URL from your .env file (not from alembic.ini) ──
config.set_main_option("sqlalchemy.url", settings.database_url)

# ── Setup logging from alembic.ini ──
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── This is what Alembic compares against your DB to find changes ──
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations without a live DB connection.
    Used when you just want to generate SQL scripts.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """
    Runs the actual migrations on a live connection.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Creates an async engine and runs migrations asynchronously.
    Required because we use asyncpg (async PostgreSQL driver).
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # NullPool means: don't keep connections open after migration
        # migrations run once and exit, no need for a pool
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Entry point for running migrations with a live DB connection.
    This is the function Alembic calls when you run `alembic upgrade head`.
    """
    asyncio.run(run_async_migrations())


# ── Alembic decides offline vs online based on context ──
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()