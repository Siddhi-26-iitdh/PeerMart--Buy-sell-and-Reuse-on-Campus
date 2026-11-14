"""add account_requests table and contact_messages reply fields

Revision ID: 8c9d0e1f2a3b
Revises: 7b8c9d0e1f2a
Create Date: 2026-11-14 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c9d0e1f2a3b'
down_revision: Union[str, Sequence[str], None] = '7b8c9d0e1f2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'account_requests' not in existing_tables:
        op.create_table(
            'account_requests',
            sa.Column('request_id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('request_type', sa.String(length=30), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('admin_comment', sa.Text(), nullable=True),
            sa.Column('reviewed_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('reviewed_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['reviewed_by'], ['users.user_id']),
            sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
            sa.PrimaryKeyConstraint('request_id'),
        )
        op.create_index('ix_account_requests_type_status', 'account_requests', ['request_type', 'status'], unique=False)
        op.create_index('ix_account_requests_user_id', 'account_requests', ['user_id'], unique=False)

    if 'contact_messages' in existing_tables:
        cols = {c['name'] for c in inspector.get_columns('contact_messages')}
        if 'category' not in cols:
            op.add_column(
                'contact_messages',
                sa.Column('category', sa.String(length=50), nullable=False, server_default='General Inquiry'),
            )
        if 'admin_reply' not in cols:
            op.add_column(
                'contact_messages',
                sa.Column('admin_reply', sa.Text(), nullable=True),
            )
        if 'reviewed_by' not in cols:
            op.add_column(
                'contact_messages',
                sa.Column('reviewed_by', sa.Integer(), nullable=True),
            )
        if 'updated_at' not in cols:
            op.add_column(
                'contact_messages',
                sa.Column('updated_at', sa.DateTime(), nullable=True),
            )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'contact_messages' in existing_tables:
        cols = {c['name'] for c in inspector.get_columns('contact_messages')}
        for col_name in ('updated_at', 'reviewed_by', 'admin_reply', 'category'):
            if col_name in cols:
                op.drop_column('contact_messages', col_name)

    if 'account_requests' in existing_tables:
        op.drop_index('ix_account_requests_user_id', table_name='account_requests')
        op.drop_index('ix_account_requests_type_status', table_name='account_requests')
        op.drop_table('account_requests')
