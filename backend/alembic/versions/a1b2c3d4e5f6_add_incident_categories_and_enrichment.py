"""add_incident_categories_and_enrichment

Revision ID: a1b2c3d4e5f6
Revises: 21c2a0d6048e
Create Date: 2026-06-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '21c2a0d6048e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('incident_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_incident_categories_id'), 'incident_categories', ['id'], unique=False)
    op.create_index(op.f('ix_incident_categories_name'), 'incident_categories', ['name'], unique=True)

    op.add_column('incident_types', sa.Column('category_id', sa.Integer(), sa.ForeignKey('incident_categories.id'), nullable=True))
    op.create_index(op.f('ix_incident_types_category_id'), 'incident_types', ['category_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_incident_types_category_id'), table_name='incident_types')
    op.drop_column('incident_types', 'category_id')
    op.drop_index(op.f('ix_incident_categories_name'), table_name='incident_categories')
    op.drop_index(op.f('ix_incident_categories_id'), table_name='incident_categories')
    op.drop_table('incident_categories')
