"""add availability and scheduling

Revision ID: 3c9ab84ca44c
Revises: bdfdd8f49f94
Create Date: 2026-01-13 22:36:48.330384
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "3c9ab84ca44c"
down_revision = "bdfdd8f49f94"
branch_labels = None
depends_on = None


def _table_exists(conn, table_name: str) -> bool:
    return inspect(conn).has_table(table_name)


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    # Works across Postgres/SQLite/etc
    cols = [c["name"] for c in inspect(conn).get_columns(table_name)]
    return column_name in cols


def upgrade():
    conn = op.get_bind()

    # 1) Create availability table only if it doesn't exist
    if not _table_exists(conn, "availability"):
        op.create_table(
            "availability",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("start_time", sa.DateTime(), nullable=False),
            sa.Column("end_time", sa.DateTime(), nullable=False),
            sa.Column(
                "timezone",
                sa.String(length=64),
                nullable=False,
                server_default=sa.text("'America/Denver'"),
            ),
            # ✅ boolean default that works on Postgres
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_availability_user_id", "availability", ["user_id"])

    # 2) Add columns to session_requests only if missing
    if not _column_exists(conn, "session_requests", "scheduled_start"):
        op.add_column("session_requests", sa.Column("scheduled_start", sa.DateTime(), nullable=True))

    if not _column_exists(conn, "session_requests", "scheduled_end"):
        op.add_column("session_requests", sa.Column("scheduled_end", sa.DateTime(), nullable=True))

    if not _column_exists(conn, "session_requests", "timezone"):
        op.add_column("session_requests", sa.Column("timezone", sa.String(length=64), nullable=True))

    if not _column_exists(conn, "session_requests", "schedule_status"):
        op.add_column(
            "session_requests",
            sa.Column(
                "schedule_status",
                sa.String(length=20),
                nullable=False,
                server_default=sa.text("'none'"),
            ),
        )


def downgrade():
    # Drop added columns if they exist
    conn = op.get_bind()

    if _table_exists(conn, "session_requests"):
        existing_cols = {c["name"] for c in inspect(conn).get_columns("session_requests")}

        with op.batch_alter_table("session_requests") as batch_op:
            if "schedule_status" in existing_cols:
                batch_op.drop_column("schedule_status")
            if "timezone" in existing_cols:
                batch_op.drop_column("timezone")
            if "scheduled_end" in existing_cols:
                batch_op.drop_column("scheduled_end")
            if "scheduled_start" in existing_cols:
                batch_op.drop_column("scheduled_start")

    # Drop availability table if it exists
    if _table_exists(conn, "availability"):
        with op.batch_alter_table("availability") as batch_op:
            batch_op.drop_index("ix_availability_user_id")
        op.drop_table("availability")
