"""add admin role and create logs feedback tables

Revision ID: b1aa214c0158
Revises: 3b2e04d5d117
Create Date: 2026-04-04 22:10:33.161378

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b1aa214c0158'
down_revision: Union[str, None] = '3b2e04d5d117'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    # ── Step 1: Add 'admin' to the user_role enum ──
    # Cannot use DROP/CREATE because it would destroy existing data
    # Must use ALTER TYPE to safely add new value
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'")

    # ── Step 2: Create logs table ──
    op.create_table(
        "logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("level", sa.String(20), nullable=False),
        # CRITICAL only in production
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("module", sa.String(200), nullable=True),
        sa.Column("function_name", sa.String(200), nullable=True),
        sa.Column("line_number", sa.Integer, nullable=True),
        sa.Column("traceback", sa.Text, nullable=True),
        sa.Column("request_url", sa.String(500), nullable=True),
        sa.Column("request_method", sa.String(10), nullable=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True
            # nullable because some errors happen before auth
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
    )

    # Index for fast cleanup queries and date filtering
    op.create_index(
        "ix_logs_created_at",
        "logs",
        ["created_at"]
    )
    op.create_index(
        "ix_logs_level",
        "logs",
        ["level"]
    )

    # ── Step 3: Create feedbacks table ──
    op.create_table(
        "feedbacks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True
            # SET NULL so feedback survives if user is deleted
            # We still want the feedback data even if user leaves
        ),
        sa.Column(
            "type",
            sa.Enum(
                "bug_report",
                "feature_request",
                "general",
                name="feedback_type_enum"
            ),
            nullable=False
        ),
        sa.Column("page", sa.String(200), nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("rating", sa.Integer, nullable=True),
        # 1-5 star rating, optional
        sa.Column(
            "consultation_id",
            postgresql.UUID(as_uuid=True),
            nullable=True
            # Optional reference to a specific consultation
        ),
        sa.Column(
            "status",
            sa.Enum(
                "new",
                "reviewed",
                "resolved",
                name="feedback_status_enum"
            ),
            default="new",
            nullable=False,
            server_default="new"
        ),
        sa.Column(
            "admin_notes",
            sa.Text,
            nullable=True
            # Admin can add notes when reviewing feedback
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False
        ),
    )

    op.create_index(
        "ix_feedbacks_user_id",
        "feedbacks",
        ["user_id"]
    )
    op.create_index(
        "ix_feedbacks_status",
        "feedbacks",
        ["status"]
    )


def downgrade() -> None:
    # Drop tables
    op.drop_table("feedbacks")
    op.drop_table("logs")

    # Note: PostgreSQL doesn't support removing values from an ENUM
    # So we can't easily undo the 'admin' addition
    # In production you'd need to recreate the enum
    # For development just drop and recreate the DB if needed
    pass