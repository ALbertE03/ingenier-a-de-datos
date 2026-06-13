"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter, ZAxis,
} from "recharts"
import {
  IncidentCategorySummary, DelaySeverityDist, TimeSlotAnalysis,
  SeasonAnalysis, VehicleReliability, DelayDistribution,
  RouteTrend, RouteDirectionAnalysis, HourlyHeatmap,
} from "./interfaces"

const COLORS = [
  "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
  "#f43f5e", "#6366f1", "#14b8a6", "#e11d48",
  "#d946ef", "#0ea5e9", "#84cc16", "#f97316",
  "#78716c", "#2dd4bf", "#fb923c", "#a78bfa",
]

const SEVERITY_COLORS: Record<string, string> = {
  Minor: "#10b981",
  Moderate: "#f59e0b",
  Significant: "#f97316",
  Severe: "#ef4444",
  Critical: "#dc2626",
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs shadow-2xl backdrop-blur-md">
      <p className="text-white font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: <span className="font-bold">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
          {p.name.includes("%") || p.payload?.percentage ? "" : ""}
        </p>
      ))}
    </div>
  )
}

function formatPct(v: number) {
  return `${v.toFixed(1)}%`
}

export function IncidentCategoryPie({ data }: { data: IncidentCategorySummary[] }) {
  if (!data.length) return null
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Incidentes por Categoría</h4>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie data={data} dataKey="total_delays" nameKey="category" cx="50%" cy="50%" outerRadius={110} innerRadius={50} label={({ payload }) => `${(payload as any).category} (${formatPct((payload as any).percentage)})`} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SeverityChart({ data }: { data: DelaySeverityDist[] }) {
  if (!data.length) return null
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Distribución por Severidad</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="severity" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[4, 4, 0, 0]}>
            {data.map((r) => <Cell key={r.severity} fill={SEVERITY_COLORS[r.severity] || "#8b5cf6"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TimeSlotChart({ data }: { data: TimeSlotAnalysis[] }) {
  if (!data.length) return null
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Franja Horaria</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="time_slot" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SeasonChart({ data }: { data: SeasonAnalysis[] }) {
  if (!data.length) return null
  const seasonColors: Record<string, string> = {
    Winter: "#93c5fd", Spring: "#86efac", Summer: "#fde047", Fall: "#fdba74",
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Estación</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="season" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[4, 4, 0, 0]}>
            {data.map((r) => <Cell key={r.season} fill={seasonColors[r.season] || "#8b5cf6"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DelayDistChart({ data }: { data: DelayDistribution[] }) {
  if (!data.length) return null
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Distribución de Duración de Retrasos</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="range_label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Cantidad" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VehicleChart({ data }: { data: VehicleReliability[] }) {
  if (!data.length) return null
  const chartData = data.slice(0, 15).map(v => ({ ...v, vehicle: `#${v.vehicle_number}` }))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Vehículos con más Retrasos (Top 15)</h4>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis dataKey="vehicle" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RouteTrendChart({ data }: { data: RouteTrend[] }) {
  if (!data.length) return null
  const routes = [...new Set(data.map((r) => r.route))].slice(0, 8)
  const filtered = data.filter((r) => routes.includes(r.route))
  const byRoute: Record<string, { year: number; total_delays: number }[]> = {}
  for (const r of filtered) {
    if (!byRoute[r.route]) byRoute[r.route] = []
    byRoute[r.route].push({ year: r.year, total_delays: r.total_delays })
  }
  const years = [...new Set(data.map((r) => r.year))].sort() as number[]
  const chartData = years.map((y) => {
    const point: Record<string, any> = { year: String(y) }
    for (const [route, pts] of Object.entries(byRoute)) {
      const found = pts.find((p) => p.year === y)
      point[route] = found ? found.total_delays : null
    }
    return point
  })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Tendencia Anual por Ruta (Top 8)</h4>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
          {routes.map((route, i) => (
            <Line key={route} type="monotone" dataKey={route} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DirectionHeatmapChart({ data }: { data: RouteDirectionAnalysis[] }) {
  if (!data.length) return null
  const top = data.slice(0, 40)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Ruta × Dirección (Top 40)</h4>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <YAxis dataKey="route" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={50} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Retrasos" radius={[0, 4, 4, 0]}>
            {top.map((r) => <Cell key={`${r.route}-${r.direction}`} fill={r.direction === "E" ? "#8b5cf6" : r.direction === "W" ? "#06b6d4" : r.direction === "N" ? "#10b981" : r.direction === "S" ? "#f59e0b" : "#78716c"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DayHourHeatmapChart({ data }: { data: HourlyHeatmap[] }) {
  if (!data.length) return null
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const dayNames: Record<string, string> = {
    Monday: "Lun", Tuesday: "Mar", Wednesday: "Mié", Thursday: "Jue",
    Friday: "Vie", Saturday: "Sáb", Sunday: "Dom",
  }
  const maxVal = Math.max(...data.map((d) => d.total_delays))
  const grouped = dayOrder.map((day) => {
    const hours: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hours[h] = 0
    for (const d of data.filter((r) => r.day === day)) hours[d.hour] = d.total_delays
    return { day: dayNames[day], ...hours, _day: day }
  })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 overflow-x-auto">
      <h4 className="text-sm font-bold text-white mb-3">Mapa de Calor: Día × Hora</h4>
      <div className="min-w-[600px]">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="text-left text-slate-500 font-semibold p-1">Día</th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="text-slate-500 font-semibold p-1 text-center w-8">{h}h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((row) => (
              <tr key={row._day}>
                <td className="text-slate-300 font-bold p-1 whitespace-nowrap">{row.day}</td>
                {Array.from({ length: 24 }, (_, h) => {
                  const val = (row as any)[h] || 0
                  const intensity = maxVal > 0 ? val / maxVal : 0
                  const r = Math.round(8 + (1 - intensity) * 20)
                  const g = Math.round(8 + (1 - intensity) * 20)
                  const b = Math.round(40 + (1 - intensity) * 60)
                  return (
                    <td
                      key={h}
                      className="text-center p-1 font-mono font-bold"
                      style={{
                        backgroundColor: `rgba(139, 92, 246, ${0.1 + intensity * 0.8})`,
                        color: intensity > 0.5 ? "#fff" : "#94a3b8",
                      }}
                      title={`${row.day} ${h}:00 - ${val.toLocaleString()} retrasos`}
                    >
                      {val > 0 ? (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val) : ""}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
