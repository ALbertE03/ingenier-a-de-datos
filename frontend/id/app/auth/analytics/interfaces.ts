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

export interface DelaysByMonth {
  year: number
  month: number
  total_delays: number
  avg_delay_min: number
}
