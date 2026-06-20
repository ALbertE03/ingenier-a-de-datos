"""add_composite_indexes_for_performance

Revision ID: a3b4c5d6e7f8
Revises: 9f62d2c2480b
Create Date: 2026-06-13 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "9f62d2c2480b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_route_id_min_delay ON delay_records (route_id, min_delay)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_incident_type_id_min_delay ON delay_records (incident_type_id, min_delay)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_location_id_min_delay ON delay_records (location_id, min_delay)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_vehicle_id_min_delay ON delay_records (vehicle_id, min_delay)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_min_delay ON delay_records (min_delay)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_year_month ON delay_records (year, month)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_day ON delay_records (day)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_delay_records_route_id_location_id ON delay_records (route_id, location_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_delay_records_route_id_min_delay")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_incident_type_id_min_delay")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_location_id_min_delay")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_vehicle_id_min_delay")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_min_delay")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_year_month")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_day")
    op.execute("DROP INDEX IF EXISTS ix_delay_records_route_id_location_id")
