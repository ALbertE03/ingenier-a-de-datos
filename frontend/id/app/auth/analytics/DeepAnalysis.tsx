import { DeepAnalysisData, IncidentCategorySummary, DelaySeverityDist, CorrelationAnalysis, Anomaly, TimeSlotAnalysis, SeasonAnalysis, VehicleReliability, DelayDistribution, TopIncidentByRoute } from "./interfaces"

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DAY_NAMES_ES: Record<string, string> = {
  "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
  "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo",
}

function InsightCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 transition-all duration-300 hover:border-violet-500/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h4 className="text-sm font-bold text-white">{title}</h4>
      </div>
      <div className="text-xs text-slate-400 leading-relaxed space-y-1">{children}</div>
    </div>
  )
}

interface Props {
  deepAnalysis: DeepAnalysisData | null
  incidentCategories: IncidentCategorySummary[]
  delaySeverity: DelaySeverityDist[]
  timeSlots: TimeSlotAnalysis[]
  seasons: SeasonAnalysis[]
  vehicleReliability: VehicleReliability[]
  delayDistribution: DelayDistribution[]
  correlation: CorrelationAnalysis | null
  anomalies: Anomaly[]
  topIncidentsByRoute: TopIncidentByRoute[]
}

export function AdvancedAnalysis({
  deepAnalysis, incidentCategories, delaySeverity, timeSlots, seasons,
  vehicleReliability, delayDistribution, correlation, anomalies, topIncidentsByRoute,
}: Props) {
  if (!deepAnalysis) return null

  const peakHours = [...deepAnalysis.peak_hour_analysis].sort((a, b) => b.total_delays - a.total_delays)
  const worstIncidentType = [...deepAnalysis.incident_type_severity].sort((a, b) => b.avg_delay_min - a.avg_delay_min)[0]
  const mostFreqIncidentType = [...deepAnalysis.incident_type_severity].sort((a, b) => b.total_delays - a.total_delays)[0]
  const topCategory = incidentCategories.length > 0 ? incidentCategories[0] : null
  const severePct = delaySeverity.find((s) => s.severity === "Severe")
  const criticalPct = delaySeverity.find((s) => s.severity === "Critical")
  const worstVehicle = vehicleReliability.length > 0 ? vehicleReliability[0] : null
  const worstSeason = seasons.length > 0 ? [...seasons].sort((a, b) => b.total_delays - a.total_delays)[0] : null
  const worstSlot = timeSlots.length > 0 ? [...timeSlots].sort((a, b) => b.total_delays - a.total_delays)[0] : null
  const topIncidentByRoute = topIncidentsByRoute.length > 0 ? topIncidentsByRoute[0] : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Análisis Profundo</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <InsightCard icon="📊" title="Ruta más problemática">
          <p>La ruta <strong className="text-amber-300">{deepAnalysis.route_with_highest_avg_delay?.route || "N/A"}</strong> tiene el promedio de retraso más alto: <strong className="text-white">{deepAnalysis.route_with_highest_avg_delay?.avg_delay_min} min</strong>.</p>
          {topIncidentByRoute && <p className="mt-1">El incidente más común en esta ruta es <strong className="text-violet-300">{topIncidentByRoute.incident_type}</strong> ({topIncidentByRoute.percentage}% de los casos).</p>}
        </InsightCard>

        <InsightCard icon="📅" title={`Peor día: ${deepAnalysis.worst_day_for_delays ? DAY_NAMES_ES[deepAnalysis.worst_day_for_delays] || deepAnalysis.worst_day_for_delays : "N/A"}`}>
          <p>Concentra la mayor cantidad de retrasos. Los fines de semana ({["Saturday", "Sunday"].includes(deepAnalysis.worst_day_for_delays || "") ? "sí" : "no"}) son los días críticos.</p>
        </InsightCard>

        <InsightCard icon="⏰" title="Horas pico de retrasos">
          {peakHours.slice(0, 3).map((h) => (
            <p key={h.hour}><strong className="text-cyan-300">{h.hour}</strong>: {h.total_delays.toLocaleString()} retrasos (prom. {h.avg_delay_min} min)</p>
          ))}
          {worstSlot && <p className="mt-1">Franja más crítica: <strong className="text-white">{worstSlot.time_slot}</strong> ({worstSlot.total_delays.toLocaleString()} eventos)</p>}
        </InsightCard>

        <InsightCard icon="📈" title={deepAnalysis.month_with_most_delays ? `${MONTH_NAMES[deepAnalysis.month_with_most_delays.month - 1]} ${deepAnalysis.month_with_most_delays.year}` : "Mes pico"}>
          <p>Fue el mes con más retrasos: <strong className="text-white">{deepAnalysis.month_with_most_delays?.total_delays.toLocaleString()}</strong> incidentes.</p>
        </InsightCard>

        <InsightCard icon="⏱️" title="Horas de retraso totales">
          <p>Se han acumulado <strong className="text-white">{deepAnalysis.total_delay_hours.toLocaleString()}</strong> horas de retraso. Promedio de <strong className="text-white">{(deepAnalysis.total_delay_hours / (deepAnalysis.year_over_year_trend.length || 1)).toFixed(0)}</strong> hrs/año.</p>
        </InsightCard>

        <InsightCard icon="🚦" title="Tipo de incidente más severo">
          {worstIncidentType && <p><strong className="text-rose-300">{worstIncidentType.incident_type}</strong> tiene el mayor promedio: <strong className="text-white">{worstIncidentType.avg_delay_min} min</strong>.</p>}
          {mostFreqIncidentType && <p className="mt-1">El más frecuente es <strong className="text-violet-300">{mostFreqIncidentType.incident_type}</strong> con {mostFreqIncidentType.total_delays.toLocaleString()} casos.</p>}
        </InsightCard>

        <InsightCard icon="🧭" title="Análisis por dirección">
          {deepAnalysis.avg_delay_by_direction.map((d) => (
            <p key={d.direction}>{d.direction === "E" ? "Este" : d.direction === "W" ? "Oeste" : d.direction === "N" ? "Norte" : d.direction === "S" ? "Sur" : d.direction}: <strong className="text-white">{d.total_delays.toLocaleString()}</strong> retrasos, prom. <strong className="text-white">{d.avg_delay_min} min</strong></p>
          ))}
        </InsightCard>

        <InsightCard icon="🔄" title="Tendencia anual">
          {[...deepAnalysis.year_over_year_trend].sort((a, b) => b.year - a.year).slice(0, 3).map((y) => (
            <p key={y.year}>{y.year}: <strong className="text-white">{y.total_delays.toLocaleString()}</strong> retrasos (prom. {y.avg_delay_min} min)</p>
          ))}
        </InsightCard>

        <InsightCard icon="🏷️" title="Categorías de incidente">
          {topCategory && <p>La categoría <strong className="text-amber-300">{topCategory.category}</strong> domina con <strong className="text-white">{topCategory.percentage}%</strong> de todos los retrasos.</p>}
          <p className="mt-1">Categorías con mayor severidad: <strong className="text-rose-300">{incidentCategories.filter(c => c.avg_delay_min > 15).map(c => c.category).join(", ") || "ninguna sobre 15 min"}</strong></p>
        </InsightCard>

        <InsightCard icon="⚠️" title="Severidad de retrasos">
          {severePct && <p>Retrasos <strong className="text-orange-300">Severos</strong>: {severePct.total_delays.toLocaleString()} ({severePct.percentage}%)</p>}
          {criticalPct && <p>Retrasos <strong className="text-red-400">Críticos</strong>: {criticalPct.total_delays.toLocaleString()} ({criticalPct.percentage}%)</p>}
          <p className="mt-1">El {(severePct?.percentage || 0) + (criticalPct?.percentage || 0) > 0 ? ((severePct?.percentage || 0) + (criticalPct?.percentage || 0)).toFixed(1) : "0"}% de los retrasos son severos o críticos.</p>
        </InsightCard>

        <InsightCard icon="🌤️" title="Estacionalidad">
          {worstSeason && <p>La estación con más retrasos es <strong className="text-sky-300">{worstSeason.season}</strong> ({worstSeason.total_delays.toLocaleString()} eventos).</p>}
          <p className="mt-1">Distribución por estaciones: {seasons.map(s => `${s.season} (${s.total_delays.toLocaleString()})`).join(" · ")}</p>
        </InsightCard>

        <InsightCard icon="🚋" title="Vehículo más problemático">
          {worstVehicle ? <p>Vehículo <strong className="text-amber-300">#{worstVehicle.vehicle_number}</strong> con {worstVehicle.total_delays.toLocaleString()} retrasos (prom. {worstVehicle.avg_delay_min} min, máx. {worstVehicle.max_delay_min} min).</p> : <p>Sin datos de vehículos.</p>}
        </InsightCard>

        <InsightCard icon="📉" title="Correlación Delay-Gap">
          {correlation ? (
            <>
              <p>Coeficiente de Pearson: <strong className="text-white">{correlation.pearson_correlation}</strong></p>
              <p className="text-slate-500 italic">{correlation.interpretation}</p>
            </>
          ) : <p>Sin datos suficientes para correlación.</p>}
        </InsightCard>

        <InsightCard icon="🔍" title="Anomalías detectadas">
          <p>Se detectaron <strong className="text-white">{anomalies.length}</strong> eventos anómalos (outliers estadísticos con z-score &ge; 3).</p>
          {anomalies.length > 0 && (
            <>
              <p className="mt-1">El más extremo: <strong className="text-red-400">{anomalies[0].min_delay} min</strong> (z-score: {anomalies[0].z_score}) en ruta <strong className="text-amber-300">{anomalies[0].route}</strong> ({anomalies[0].location}).</p>
              <p className="text-slate-500 italic">Fecha: {anomalies[0].report_date} · Tipo: {anomalies[0].incident_type}</p>
            </>
          )}
        </InsightCard>
      </div>
    </div>
  )
}
