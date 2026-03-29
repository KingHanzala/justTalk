"""group roles and soft delete

Revision ID: 0002_group_roles_and_soft_delete
Revises: 0001_initial_schema
Create Date: 2026-03-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_group_roles_and_soft_delete"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_members", sa.Column("role", sa.String(), nullable=True))
    op.execute("UPDATE chat_members SET role = CASE WHEN is_admin THEN 'admin' ELSE 'member' END")
    op.alter_column("chat_members", "role", nullable=False)
    op.drop_column("chat_members", "is_admin")

    op.add_column("messages", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.add_column("messages", sa.Column("deleted_by_user_id", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_messages_deleted_by_user_id_users",
        "messages",
        "users",
        ["deleted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_messages_deleted_by_user_id_users", "messages", type_="foreignkey")
    op.drop_column("messages", "deleted_by_user_id")
    op.drop_column("messages", "deleted_at")

    op.add_column("chat_members", sa.Column("is_admin", sa.Boolean(), nullable=True))
    op.execute("UPDATE chat_members SET is_admin = CASE WHEN role = 'admin' THEN 1 ELSE 0 END")
    op.alter_column("chat_members", "is_admin", nullable=False)
    op.drop_column("chat_members", "role")
