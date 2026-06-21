import enum
from sqlalchemy import Column, Integer, String, Boolean, Float, Date, Time, ForeignKey, Index

from src.db.session import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    INSPECTOR = "inspector"
    ANALYST = "analyst"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.ANALYST.value, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)


class IncidentCategory(Base):
    __tablename__ = "incident_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)


class IncidentType(Base):
    __tablename__ = "incident_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("incident_categories.id"), nullable=True, index=True)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(Integer, unique=True, index=True, nullable=False)


class LocationCoordinate(Base):
    __tablename__ = "location_coordinates"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, unique=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    full_address = Column(String, nullable=True)
    source = Column(String, nullable=True)


class DelayRecord(Base):
    __tablename__ = "delay_records"

    __table_args__ = (
        Index("ix_delay_records_route_id_min_delay", "route_id", "min_delay"),
        Index("ix_delay_records_incident_type_id_min_delay", "incident_type_id", "min_delay"),
        Index("ix_delay_records_location_id_min_delay", "location_id", "min_delay"),
        Index("ix_delay_records_vehicle_id_min_delay", "vehicle_id", "min_delay"),
        Index("ix_delay_records_min_delay", "min_delay"),
        Index("ix_delay_records_year_month", "year", "month"),
        Index("ix_delay_records_day", "day"),
        Index("ix_delay_records_route_id_location_id", "route_id", "location_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(Date, nullable=False, index=True)
    time = Column(Time, nullable=True)
    day = Column(String, nullable=True)
    min_delay = Column(Integer, nullable=True)
    min_gap = Column(Integer, nullable=True)
    direction = Column(String, nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True, index=True)
    incident_type_id = Column(Integer, ForeignKey("incident_types.id"), nullable=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    delay_hours = Column(Float, nullable=True)
    delay_severity = Column(String, nullable=True, index=True)
    time_slot = Column(String, nullable=True, index=True)
    season = Column(String, nullable=True, index=True)
    is_weekend = Column(Boolean, nullable=True)
    normalized_direction = Column(String, nullable=True, index=True)
    year = Column(Integer, nullable=True, index=True)
    month = Column(Integer, nullable=True, index=True)
    week = Column(Integer, nullable=True)
    quarter = Column(Integer, nullable=True)
    weather_id = Column(Integer, ForeignKey("weather_records.id"), nullable=True, index=True)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    report_date = Column(Date, nullable=False, index=True)
    status = Column(String, default="open", nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(Date, nullable=False)
    resolved_at = Column(Date, nullable=True)


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True, nullable=False)
    temp_max = Column(Float, nullable=True)
    temp_min = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    snowfall = Column(Float, nullable=True)
    weather_code = Column(Integer, nullable=True)
    weather_desc = Column(String, nullable=True)
