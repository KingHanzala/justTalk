"""membership status

Revision ID: 0003_membership_status
Revises: 0002_group_roles_and_soft_delete
Create Date: 2026-03-29 00:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_membership_status"
down_revision = "0002_group_roles_and_soft_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_members", sa.Column("status", sa.String(), nullable=True))
    op.add_column("chat_members", sa.Column("removed_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE chat_members SET status = 'active'")
    op.alter_column("chat_members", "status", nullable=False)


def downgrade() -> None:
    op.drop_column("chat_members", "removed_at")
    op.drop_column("chat_members", "status")
