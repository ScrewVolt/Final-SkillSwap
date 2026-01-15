"""reserve availability slot for session requests

Revision ID: 9e9a264e7845
Revises: 22cba7ee99c1
Create Date: 2026-01-14 18:30:12.349204

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9e9a264e7845"
down_revision = "22cba7ee99c1"
branch_labels = None
depends_on = None

FK_NAME = "fk_availability_reserved_request_id"
IX_NAME = "ix_availability_reserved_request_id"


def upgrade():
    with op.batch_alter_table("availability", schema=None) as batch_op:
        batch_op.add_column(sa.Column("reserved_request_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("reserved_at", sa.DateTime(), nullable=True))

        # Give the index an explicit stable name (works across SQLite/Postgres/etc.)
        batch_op.create_index(IX_NAME, ["reserved_request_id"], unique=False)

        # ✅ Name the FK constraint (required for SQLite batch mode)
        batch_op.create_foreign_key(
            "fk_availability_reserved_request_id",
            "session_requests",
            ["reserved_request_id"],
            ["id"],
        )

def downgrade():
    with op.batch_alter_table("availability", schema=None) as batch_op:
        # Must match the explicit names above
        batch_op.drop_constraint("fk_availability_reserved_request_id", type_="foreignkey")
        batch_op.drop_index(IX_NAME)
        batch_op.drop_column("reserved_at")
        batch_op.drop_column("reserved_request_id")
