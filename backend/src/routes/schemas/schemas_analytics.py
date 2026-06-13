from pydantic import BaseModel


class DelaysByRoute(BaseModel):
    route: str
    total_delays: int
    avg_delay_min: float
    max_delay_min: int


class DelaysByType(BaseModel):
    incident_type: str
    total_delays: int
    avg_delay_min: float


class DelaysByMonth(BaseModel):
    year: int
    month: int
    total_delays: int
    avg_delay_min: float


class DelaysByDay(BaseModel):
    day: str
    total_delays: int
    avg_delay_min: float


class WorstLocation(BaseModel):
    location: str
    total_delays: int
    avg_delay_min: float


class Summary(BaseModel):
    total_records: int
    total_routes: int
    total_locations: int
    total_incident_types: int
    total_vehicles: int
    overall_avg_delay: float
    busiest_route: str | None = None
    most_common_incident: str | None = None


class DirectionAnalysis(BaseModel):
    direction: str
    total_delays: int
    avg_delay_min: float


class YearOverYear(BaseModel):
    year: int
    total_delays: int
    avg_delay_min: float


class PeakHour(BaseModel):
    hour: str
    total_delays: int
    avg_delay_min: float


class IncidentSeverity(BaseModel):
    incident_type: str
    total_delays: int
    avg_delay_min: float


class DeepAnalysis(BaseModel):
    route_with_highest_avg_delay: DelaysByRoute | None = None
    worst_day_for_delays: str | None = None
    month_with_most_delays: DelaysByMonth | None = None
    total_delay_hours: float
    avg_delay_by_direction: list[DirectionAnalysis]
    year_over_year_trend: list[YearOverYear]
    peak_hour_analysis: list[PeakHour]
    incident_type_severity: list[IncidentSeverity]
