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
    overall_avg_gap: float
    max_delay: int
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


class IncidentCategorySummary(BaseModel):
    category: str
    total_delays: int
    avg_delay_min: float
    percentage: float


class DelaySeverityDist(BaseModel):
    severity: str
    total_delays: int
    avg_delay_min: float
    percentage: float


class TimeSlotAnalysis(BaseModel):
    time_slot: str
    total_delays: int
    avg_delay_min: float


class SeasonAnalysis(BaseModel):
    season: str
    total_delays: int
    avg_delay_min: float


class VehicleReliability(BaseModel):
    vehicle_number: int
    total_delays: int
    avg_delay_min: float
    max_delay_min: int


class DelayDistribution(BaseModel):
    range_label: str
    min_val: int
    max_val: int
    count: int
    percentage: float


class RouteTrend(BaseModel):
    route: str
    year: int
    total_delays: int
    avg_delay_min: float


class CorrelationAnalysis(BaseModel):
    pearson_correlation: float
    interpretation: str


class RouteDirectionAnalysis(BaseModel):
    route: str
    direction: str
    total_delays: int
    avg_delay_min: float


class TopIncidentByRoute(BaseModel):
    route: str
    incident_type: str
    total_delays: int
    percentage: float


class HourlyHeatmap(BaseModel):
    day: str
    hour: int
    total_delays: int


class MonthlyComparison(BaseModel):
    month: int
    month_name: str
    yearly_data: list[dict]


class Anomaly(BaseModel):
    id: int
    report_date: str
    route: str
    location: str
    incident_type: str
    min_delay: int
    direction: str | None = None
    z_score: float


# ── Map & Route Network ──

class LocationWithCoords(BaseModel):
    id: int
    name: str
    total_delays: int
    avg_delay_min: float
    latitude: float | None = None
    longitude: float | None = None


class RouteNetworkNode(BaseModel):
    location_id: int
    location_name: str
    latitude: float | None = None
    longitude: float | None = None
    total_delays: int
    avg_delay_min: float


class RouteNetworkLink(BaseModel):
    route: str
    from_location: str
    to_location: str
    total_delays: int
    avg_delay_min: float
    direction: str | None = None


class RouteMapData(BaseModel):
    route: str
    total_delays: int
    avg_delay_min: float
    max_delay_min: int
    locations: list[RouteNetworkNode]


class RouteEndpoint(BaseModel):
    route: str
    total_delays: int
    avg_delay_min: float
    description: str | None = None


class EndpointDescription(BaseModel):
    path: str
    method: str
    title: str
    description: str
    tags: list[str]
    sample_response: dict
