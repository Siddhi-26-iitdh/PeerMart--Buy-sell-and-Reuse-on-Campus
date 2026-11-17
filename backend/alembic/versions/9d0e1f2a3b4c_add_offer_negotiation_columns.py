"""add offer counteroffer negotiation columns

Revision ID: 9d0e1f2a3b4c
Revises: 8c9d0e1f2a3b
Create Date: 2026-11-17 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d0e1f2a3b4c'
down_revision: Union[str, Sequence[str], None] = '8c9d0e1f2a3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'offers' in existing_tables:
        cols = {c['name'] for c in inspector.get_columns('offers')}
        if 'last_actor' not in cols:
            op.add_column(
                'offers',
                sa.Column('last_actor', sa.String(length=20), nullable=False, server_default='buyer'),
            )
        if 'updated_at' not in cols:
            op.add_column(
                'offers',
                sa.Column('updated_at', sa.DateTime(), nullable=True),
            )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'offers' in existing_tables:
        cols = {c['name'] for c in inspector.get_columns('offers')}
        for col_name in ('updated_at', 'last_actor'):
            if col_name in cols:
                op.drop_column('offers', col_name)
