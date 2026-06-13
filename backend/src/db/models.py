from sqlalchemy import Column, Integer, String, Boolean, Date, Time, ForeignKey, Float
from sqlalchemy.orm import relationship
from src.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class IncidentCategory(Base):
    __tablename__ = "incident_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    incident_types = relationship("IncidentType", back_populates="category")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)

    delay_records = relationship("DelayRecord", back_populates="route")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    delay_records = relationship("DelayRecord", back_populates="location")


class IncidentType(Base):
    __tablename__ = "incident_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("incident_categories.id"), nullable=True, index=True)

    category = relationship("IncidentCategory", back_populates="incident_types")
    delay_records = relationship("DelayRecord", back_populates="incident_type")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(Integer, unique=True, index=True, nullable=False)

    delay_records = relationship("DelayRecord", back_populates="vehicle")


class DelayRecord(Base):
    __tablename__ = "delay_records"

    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(Date, nullable=False, index=True)
    time = Column(Time, nullable=True)
    day = Column(String, nullable=True)
    min_delay = Column(Integer, nullable=True)
    min_gap = Column(Integer, nullable=True)
    direction = Column(String, nullable=True)
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

    route_id = Column(Integer, ForeignKey("routes.id"), index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), index=True)
    incident_type_id = Column(Integer, ForeignKey("incident_types.id"), index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), index=True)

    route = relationship("Route", back_populates="delay_records")
    location = relationship("Location", back_populates="delay_records")
    incident_type = relationship("IncidentType", back_populates="delay_records")
    vehicle = relationship("Vehicle", back_populates="delay_records")
