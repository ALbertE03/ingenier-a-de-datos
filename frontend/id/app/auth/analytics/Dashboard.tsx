"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, BarChart3, Table2, BrainCircuit, AlertTriangle, ChevronDown, ChevronRight, Layers, Map } from "lucide-react"
import { AnalyticsData, DeepAnalysisData, CorrelationAnalysis, Anomaly } from "./interfaces"
import { SummaryCards } from "./SummaryCards"
import {
  RoutesChart, AvgDelayRouteChart, IncidentTypeChart, MonthlyTrendChart,
  DayOfWeekChart, WorstLocationsChart, AvgDelayByDayChart,
} from "./AnalyticsCharts"
import {
  IncidentCategoryPie, SeverityChart, TimeSlotChart, SeasonChart,
  DelayDistChart, VehicleChart, RouteTrendChart, DirectionHeatmapChart, DayHourHeatmapChart,
} from "./AdvancedCharts"
import {
  RoutesTable, IncidentTypeTable, MonthlyTable,
  DayOfWeekTable, LocationsTable, DirectionTable, YearOverYearTable,
} from "./DynamicTables"
import {
  CategoryTable, SeverityTable, TimeSlotTable, SeasonTable,
  VehicleTable, TopIncidentsTable, AnomaliesTable,
} from "./AdvancedTables"
import { AdvancedAnalysis } from "./DeepAnalysis"
import dynamic from "next/dynamic"

const LocationsMap = dynamic(() => import("./MapView").then((m) => m.LocationsMap), { ssr: false })
const RouteNetworkMap = dynamic(() => import("./MapView").then((m) => m.RouteNetworkMap), { ssr: false })

type ViewMode = "charts" | "tables" | "analysis" | "maps"
type SectionKey = "basic" | "categories" | "severity" | "timeslots" | "seasons" | "vehicles" | "route_trends" | "direction" | "heatmap" | "anomalies"

const API_BASE = "http://localhost:8000/api/v1/analytics"

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({
    summary: null, delaysByRoute: [], delaysByType: [], delaysByMonth: [], delaysByDay: [],
    worstLocations: [], deepAnalysis: null, incidentCategories: [], delaySeverity: [],
    timeSlots: [], seasons: [], vehicleReliability: [], delayDistribution: [],
    routeTrends: [], directionHeatmap: [], topIncidentsByRoute: [], dayHourHeatmap: [],
    anomalies: [], correlation: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("analysis")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    categories: true, severity: true, timeslots: true, seasons: true,
    vehicles: true, route_trends: true, direction: true, heatmap: true, anomalies: true,
  })
  const isMounted = useRef(true)

  useEffect(() => { return () => { isMounted.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [
        summary, delaysByRoute, delaysByType, delaysByMonth, delaysByDay,
        worstLocations, deepAnalysis, incidentCategories, delaySeverity,
        timeSlots, seasons, vehicleReliability, delayDistribution,
        routeTrends, directionHeatmap, topIncidentsByRoute, dayHourHeatmap, anomalies, correlation,
      ] = await Promise.all([
        fetchJson<any>(`${API_BASE}/summary`),
        fetchJson<any[]>(`${API_BASE}/delays-by-route`),
        fetchJson<any[]>(`${API_BASE}/delays-by-type`),
        fetchJson<any[]>(`${API_BASE}/delays-by-month`),
        fetchJson<any[]>(`${API_BASE}/delays-by-day`),
        fetchJson<any[]>(`${API_BASE}/worst-locations`),
        fetchJson<DeepAnalysisData>(`${API_BASE}/deep-analysis`).catch(() => null),
        fetchJson<any[]>(`${API_BASE}/incident-categories`),
        fetchJson<any[]>(`${API_BASE}/delay-severity`),
        fetchJson<any[]>(`${API_BASE}/time-slots`),
        fetchJson<any[]>(`${API_BASE}/seasons`),
        fetchJson<any[]>(`${API_BASE}/vehicle-reliability`),
        fetchJson<any[]>(`${API_BASE}/delay-distribution`),
        fetchJson<any[]>(`${API_BASE}/route-trends`),
        fetchJson<any[]>(`${API_BASE}/direction-heatmap`),
        fetchJson<any[]>(`${API_BASE}/top-incidents-by-route`),
        fetchJson<any[]>(`${API_BASE}/day-hour-heatmap`),
        fetchJson<any[]>(`${API_BASE}/anomalies`),
        fetchJson<CorrelationAnalysis>(`${API_BASE}/correlation`).catch(() => null),
      ])
      if (isMounted.current) {
        setData({
          summary, delaysByRoute, delaysByType, delaysByMonth, delaysByDay,
          worstLocations, deepAnalysis, incidentCategories, delaySeverity,
          timeSlots, seasons, vehicleReliability, delayDistribution,
          routeTrends, directionHeatmap, topIncidentsByRoute, dayHourHeatmap,
          anomalies, correlation,
        })
      }
    } catch (err) {
      if (isMounted.current) setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleSection = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  const tabs = [
    { key: "charts" as ViewMode, label: "Gráficas", icon: <BarChart3 size={14} /> },
    { key: "tables" as ViewMode, label: "Tablas", icon: <Table2 size={14} /> },
    { key: "maps" as ViewMode, label: "Mapas", icon: <Map size={14} /> },
    { key: "analysis" as ViewMode, label: "Análisis", icon: <BrainCircuit size={14} /> },
  ]

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-violet-400" />
            Analytics Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Análisis multidimensional de retrasos de tranvías TTC &mdash; 158K registros, 12 años de datos
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-all disabled:opacity-50 cursor-pointer">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      <SummaryCards summary={data.summary} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setViewMode(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === tab.key ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs"><AlertTriangle size={14} />{error}</div>}

      {/* ===== CHARTS VIEW ===== */}
      {viewMode === "charts" && (
        <div className="space-y-4">
          {/* Basic Charts */}
          <SectionBlock title="Retrasos por Ruta" expanded={true}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RoutesChart data={data.delaysByRoute} />
              <AvgDelayRouteChart data={data.delaysByRoute} />
            </div>
          </SectionBlock>
          <SectionBlock title="Tipos de Incidente" expanded={true}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <IncidentTypeChart data={data.delaysByType} />
              <IncidentCategoryPie data={data.incidentCategories} />
            </div>
          </SectionBlock>
          <SectionBlock title="Tendencia Temporal" expanded={true}>
            <MonthlyTrendChart data={data.delaysByMonth} />
          </SectionBlock>
          <SectionBlock title="Días de la Semana" expanded={true}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DayOfWeekChart data={data.delaysByDay} />
              <AvgDelayByDayChart data={data.delaysByDay} />
            </div>
          </SectionBlock>
          <SectionBlock title="Ubicaciones Críticas" expanded={true}>
            <WorstLocationsChart data={data.worstLocations} />
          </SectionBlock>

          {/* Advanced Charts */}
          <SectionBlock title="Severidad y Distribución" expanded={true}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SeverityChart data={data.delaySeverity} />
              <DelayDistChart data={data.delayDistribution} />
            </div>
          </SectionBlock>
          <SectionBlock title="Franjas Horarias y Estaciones" expanded={true}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TimeSlotChart data={data.timeSlots} />
              <SeasonChart data={data.seasons} />
            </div>
          </SectionBlock>
          <SectionBlock title="Tendencia Anual por Ruta" expanded={true}>
            <RouteTrendChart data={data.routeTrends} />
          </SectionBlock>
          <SectionBlock title="Vehículos más Problemáticos" expanded={true}>
            <VehicleChart data={data.vehicleReliability} />
          </SectionBlock>
          <SectionBlock title="Ruta × Dirección" expanded={true}>
            <DirectionHeatmapChart data={data.directionHeatmap} />
          </SectionBlock>
          <SectionBlock title="Mapa de Calor: Día × Hora" expanded={true}>
            <DayHourHeatmapChart data={data.dayHourHeatmap} />
          </SectionBlock>
        </div>
      )}

      {/* ===== TABLES VIEW ===== */}
      {viewMode === "tables" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoutesTable data={data.delaysByRoute} />
          <IncidentTypeTable data={data.delaysByType} />
          <CategoryTable data={data.incidentCategories} />
          <SeverityTable data={data.delaySeverity} />
          <MonthlyTable data={data.delaysByMonth} />
          <DayOfWeekTable data={data.delaysByDay} />
          <TimeSlotTable data={data.timeSlots} />
          <SeasonTable data={data.seasons} />
          <LocationsTable data={data.worstLocations} />
          <VehicleTable data={data.vehicleReliability} />
          <TopIncidentsTable data={data.topIncidentsByRoute} />
          {data.deepAnalysis && (
            <>
              <DirectionTable data={data.deepAnalysis.avg_delay_by_direction} />
              <YearOverYearTable data={data.deepAnalysis.year_over_year_trend} />
            </>
          )}
          <AnomaliesTable data={data.anomalies} />
        </div>
      )}

      {/* ===== MAPS VIEW ===== */}
      {viewMode === "maps" && (
        <div className="space-y-4">
          <SectionBlock title="Hotspots de Retrasos" expanded={true}>
            <LocationsMap />
          </SectionBlock>
          <SectionBlock title="Red de Rutas" expanded={true}>
            <RouteNetworkMap />
          </SectionBlock>
        </div>
      )}

      {/* ===== ANALYSIS VIEW ===== */}
      {viewMode === "analysis" && (
        <AdvancedAnalysis
          deepAnalysis={data.deepAnalysis}
          incidentCategories={data.incidentCategories}
          delaySeverity={data.delaySeverity}
          timeSlots={data.timeSlots}
          seasons={data.seasons}
          vehicleReliability={data.vehicleReliability}
          delayDistribution={data.delayDistribution}
          correlation={data.correlation}
          anomalies={data.anomalies}
          topIncidentsByRoute={data.topIncidentsByRoute}
        />
      )}
    </div>
  )
}

function SectionBlock({ title, expanded, children }: { title: string; expanded: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
      <div className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
        {children}
      </div>
    </div>
  )
}
