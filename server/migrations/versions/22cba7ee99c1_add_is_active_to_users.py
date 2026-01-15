"""add is_active to users

Revision ID: 22cba7ee99c1
Revises: 3c9ab84ca44c
Create Date: 2026-01-14 14:30:34.734583
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "22cba7ee99c1"
down_revision = "3c9ab84ca44c"
branch_labels = None
depends_on = None


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    return column_name in [c["name"] for c in inspect(conn).get_columns(table_name)]


def upgrade():
    conn = op.get_bind()

    if not _column_exists(conn, "users", "is_active"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "is_active",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.true(),  # ✅ FIXED for Postgres
                )
            )

        # optional cleanup: remove default after backfill
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.alter_column("is_active", server_default=None)


def downgrade():
    conn = op.get_bind()

    if _column_exists(conn, "users", "is_active"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_column("is_active")
