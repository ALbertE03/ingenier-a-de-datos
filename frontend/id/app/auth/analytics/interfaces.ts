export interface Summary {
  total_records: number
  total_routes: number
  total_locations: number
  total_incident_types: number
  total_vehicles: number
  overall_avg_delay: number
  overall_avg_gap: number
  max_delay: number
  busiest_route: string | null
  most_common_incident: string | null
}

export interface DelaysByRoute {
  route: string
  total_delays: number
  avg_delay_min: number
  max_delay_min: number
}

export interface DelaysByType {
  incident_type: string
  total_delays: number
  avg_delay_min: number
}

export interface DelaysByMonth {
  year: number
  month: number
  total_delays: number
  avg_delay_min: number
}

export interface DelaysByDay {
  day: string
  total_delays: number
  avg_delay_min: number
}

export interface WorstLocation {
  location: string
  total_delays: number
  avg_delay_min: number
}

export interface DeepAnalysisData {
  route_with_highest_avg_delay: DelaysByRoute | null
  worst_day_for_delays: string | null
  month_with_most_delays: DelaysByMonth | null
  total_delay_hours: number
  avg_delay_by_direction: { direction: string; avg_delay_min: number; total_delays: number }[]
  year_over_year_trend: { year: number; total_delays: number; avg_delay_min: number }[]
  peak_hour_analysis: { hour: string; total_delays: number; avg_delay_min: number }[]
  incident_type_severity: { incident_type: string; avg_delay_min: number; total_delays: number }[]
}

export interface IncidentCategorySummary {
  category: string
  total_delays: number
  avg_delay_min: number
  percentage: number
}

export interface DelaySeverityDist {
  severity: string
  total_delays: number
  avg_delay_min: number
  percentage: number
}

export interface TimeSlotAnalysis {
  time_slot: string
  total_delays: number
  avg_delay_min: number
}

export interface SeasonAnalysis {
  season: string
  total_delays: number
  avg_delay_min: number
}

export interface VehicleReliability {
  vehicle_number: number
  total_delays: number
  avg_delay_min: number
  max_delay_min: number
}

export interface DelayDistribution {
  range_label: string
  min_val: number
  max_val: number
  count: number
  percentage: number
}

export interface RouteTrend {
  route: string
  year: number
  total_delays: number
  avg_delay_min: number
}

export interface CorrelationAnalysis {
  pearson_correlation: number
  interpretation: string
}

export interface RouteDirectionAnalysis {
  route: string
  direction: string
  total_delays: number
  avg_delay_min: number
}

export interface TopIncidentByRoute {
  route: string
  incident_type: string
  total_delays: number
  percentage: number
}

export interface HourlyHeatmap {
  day: string
  hour: number
  total_delays: number
}

export interface Anomaly {
  id: number
  report_date: string
  route: string
  location: string
  incident_type: string
  min_delay: number
  direction: string | null
  z_score: number
}

export interface AnalyticsData {
  summary: Summary | null
  delaysByRoute: DelaysByRoute[]
  delaysByType: DelaysByType[]
  delaysByMonth: DelaysByMonth[]
  delaysByDay: DelaysByDay[]
  worstLocations: WorstLocation[]
  deepAnalysis: DeepAnalysisData | null
  incidentCategories: IncidentCategorySummary[]
  delaySeverity: DelaySeverityDist[]
  timeSlots: TimeSlotAnalysis[]
  seasons: SeasonAnalysis[]
  vehicleReliability: VehicleReliability[]
  delayDistribution: DelayDistribution[]
  routeTrends: RouteTrend[]
  directionHeatmap: RouteDirectionAnalysis[]
  topIncidentsByRoute: TopIncidentByRoute[]
  dayHourHeatmap: HourlyHeatmap[]
  anomalies: Anomaly[]
  correlation: CorrelationAnalysis | null
}
