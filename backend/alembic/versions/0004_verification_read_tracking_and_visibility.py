"""verification, read tracking, and visibility

Revision ID: 0004_v2_features
Revises: 0003_membership_status
Create Date: 2026-03-29 18:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_v2_features"
down_revision = "0003_membership_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username_normalized", sa.String(), nullable=True))
    op.add_column("users", sa.Column("is_verified", sa.Boolean(), nullable=True))
    op.add_column("users", sa.Column("verification_code_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("verification_code_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("verification_code_sent_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE users SET username_normalized = lower(username), is_verified = TRUE")
    op.alter_column("users", "username_normalized", nullable=False)
    op.alter_column("users", "is_verified", nullable=False)
    op.create_index(op.f("ix_users_username_normalized"), "users", ["username_normalized"], unique=True)

    op.add_column("chat_members", sa.Column("history_visible_until", sa.DateTime(), nullable=True))
    op.add_column("chat_members", sa.Column("last_read_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE chat_members SET last_read_at = joined_at")


def downgrade() -> None:
    op.drop_column("chat_members", "last_read_at")
    op.drop_column("chat_members", "history_visible_until")

    op.drop_index(op.f("ix_users_username_normalized"), table_name="users")
    op.drop_column("users", "verification_code_sent_at")
    op.drop_column("users", "verification_code_expires_at")
    op.drop_column("users", "verification_code_hash")
    op.drop_column("users", "is_verified")
    op.drop_column("users", "username_normalized")
