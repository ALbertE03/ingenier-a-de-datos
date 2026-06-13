"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
} from "recharts"
import { DelaysByRoute, DelaysByType, DelaysByMonth, DelaysByDay, WorstLocation } from "./interfaces"

const COLORS = [
  "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
  "#f43f5e", "#6366f1", "#14b8a6", "#e11d48",
  "#d946ef", "#0ea5e9", "#84cc16", "#f97316",
]

const DAY_ORDER: Record<string, number> = {
  "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
  "Friday": 4, "Saturday": 5, "Sunday": 6,
}

const DAY_NAMES_ES: Record<string, string> = {
  "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
  "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo",
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs shadow-2xl backdrop-blur-md">
      <p className="text-white font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: <span className="font-bold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

export function RoutesChart({ data }: { data: DelaysByRoute[] }) {
  if (!data.length) return null
  const sorted = [...data].sort((a, b) => b.total_delays - a.total_delays).slice(0, 15)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Ruta (Top 15)</h4>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis dataKey="route" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={90} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[0, 4, 4, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AvgDelayRouteChart({ data }: { data: DelaysByRoute[] }) {
  if (!data.length) return null
  const sorted = [...data].sort((a, b) => b.avg_delay_min - a.avg_delay_min).slice(0, 15)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Promedio de Retraso por Ruta (Top 15)</h4>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis dataKey="route" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} width={90} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avg_delay_min" name="Prom. Retraso (min)" fill="#06b6d4" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function IncidentTypeChart({ data }: { data: DelaysByType[] }) {
  if (!data.length) return null
  const sorted = [...data].sort((a, b) => b.total_delays - a.total_delays).slice(0, 10)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Tipo de Incidente (Top 10)</h4>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={sorted} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="incident_type" tick={{ fill: "#94a3b8", fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[4, 4, 0, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyTrendChart({ data }: { data: DelaysByMonth[] }) {
  if (!data.length) return null
  const chartData = data.map((d) => ({
    label: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
    total_delays: d.total_delays,
    avg_delay_min: d.avg_delay_min,
  }))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Tendencia Mensual de Retrasos</h4>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <Line yAxisId="left" type="monotone" dataKey="total_delays" name="Total Retrasos" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="avg_delay_min" name="Prom. (min)" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DayOfWeekChart({ data }: { data: DelaysByDay[] }) {
  if (!data.length) return null
  const sorted = [...data].sort((a, b) => (DAY_ORDER[a.day] ?? 0) - (DAY_ORDER[b.day] ?? 0))
  const chartData = sorted.map((d) => ({ ...d, day: DAY_NAMES_ES[d.day] || d.day }))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Día de la Semana</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WorstLocationsChart({ data }: { data: WorstLocation[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Ubicaciones con más Retrasos (Top 20)</h4>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <YAxis dataKey="location" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={140} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_delays" name="Total Retrasos" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AvgDelayByDayChart({ data }: { data: DelaysByDay[] }) {
  if (!data.length) return null
  const sorted = [...data].sort((a, b) => (DAY_ORDER[a.day] ?? 0) - (DAY_ORDER[b.day] ?? 0))
  const chartData = sorted.map((d) => ({ ...d, day: DAY_NAMES_ES[d.day] || d.day }))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Promedio de Retraso por Día</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avg_delay_min" name="Prom. Retraso (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
