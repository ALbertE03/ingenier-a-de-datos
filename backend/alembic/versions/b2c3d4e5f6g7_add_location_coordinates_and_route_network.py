"""add_location_coordinates

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-13 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('location_coordinates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('full_address', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('location_id'),
    )
    op.create_index(op.f('ix_location_coordinates_id'), 'location_coordinates', ['id'], unique=False)
    op.create_index(op.f('ix_location_coordinates_location_id'), 'location_coordinates', ['location_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_location_coordinates_location_id'), table_name='location_coordinates')
    op.drop_index(op.f('ix_location_coordinates_id'), table_name='location_coordinates')
    op.drop_table('location_coordinates')
