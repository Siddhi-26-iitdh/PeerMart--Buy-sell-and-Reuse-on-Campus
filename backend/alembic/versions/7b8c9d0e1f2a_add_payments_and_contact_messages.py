"""add payments and contact_messages tables

Revision ID: 7b8c9d0e1f2a
Revises: 46f65b9c0bc4
Create Date: 2026-11-14 06:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b8c9d0e1f2a'
down_revision: Union[str, Sequence[str], None] = '46f65b9c0bc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if 'contact_messages' not in existing_tables:
        op.create_table(
            'contact_messages',
            sa.Column('message_id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('listing_id', sa.Integer(), nullable=True),
            sa.Column('subject', sa.String(length=200), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['listing_id'], ['listings.listing_id']),
            sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
            sa.PrimaryKeyConstraint('message_id'),
        )
        op.create_index('ix_contact_messages_created_at', 'contact_messages', ['created_at'], unique=False)
        op.create_index('ix_contact_messages_user_id', 'contact_messages', ['user_id'], unique=False)

    if 'payments' not in existing_tables:
        op.create_table(
            'payments',
            sa.Column('payment_id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('offer_id', sa.Integer(), nullable=False),
            sa.Column('sale_id', sa.Integer(), nullable=True),
            sa.Column('buyer_id', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('payment_status', sa.String(length=30), nullable=False),
            sa.Column('payment_method', sa.String(length=50), nullable=False),
            sa.Column('payment_reference', sa.String(length=64), nullable=False),
            sa.Column('receipt_number', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['buyer_id'], ['users.user_id']),
            sa.ForeignKeyConstraint(['offer_id'], ['offers.offer_id']),
            sa.ForeignKeyConstraint(['sale_id'], ['sales.sale_id']),
            sa.PrimaryKeyConstraint('payment_id'),
            sa.UniqueConstraint('payment_reference'),
            sa.UniqueConstraint('receipt_number'),
            sa.UniqueConstraint('sale_id'),
        )
        op.create_index('ix_payments_offer_id', 'payments', ['offer_id'], unique=False)
        op.create_index('ix_payments_buyer_id', 'payments', ['buyer_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if 'payments' in existing_tables:
        op.drop_index('ix_payments_buyer_id', table_name='payments')
        op.drop_index('ix_payments_offer_id', table_name='payments')
        op.drop_table('payments')

    if 'contact_messages' in existing_tables:
        op.drop_index('ix_contact_messages_user_id', table_name='contact_messages')
        op.drop_index('ix_contact_messages_created_at', table_name='contact_messages')
        op.drop_table('contact_messages')
