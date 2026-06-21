"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts"
import { RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react"
import { Summary, DelaysByRoute, DelaysByMonth } from "./interfaces"

const API_BASE = "http://localhost:8000/api/v1/analytics"
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function n(v: number) { return v?.toLocaleString() ?? "0" }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black/90 border border-white/20 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white text-xs font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? n(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function SummaryCards({ summary }: { summary: Summary | null }) {
  if (!summary) return null
  const cards = [
    { label: "Registros", value: n(summary.total_records), sub: `${n(summary.total_routes)} rutas · ${n(summary.total_locations)} ubicaciones`, color: "from-violet-600/20 to-purple-600/5", border: "border-violet-500/20", text: "text-violet-300" },
    { label: "Retraso Promedio", value: `${summary.overall_avg_delay} min`, sub: `Máx: ${summary.max_delay} min · Gap: ${summary.overall_avg_gap} min`, color: "from-cyan-600/20 to-blue-600/5", border: "border-cyan-500/20", text: "text-cyan-300" },
    { label: "Ruta + Congestionada", value: summary.busiest_route || "N/A", sub: `${n(summary.total_routes)} rutas activas`, color: "from-amber-600/20 to-orange-600/5", border: "border-amber-500/20", text: "text-amber-300" },
    { label: "Incidente + Común", value: summary.most_common_incident || "N/A", sub: `${n(summary.total_incident_types)} tipos`, color: "from-rose-600/20 to-pink-600/5", border: "border-rose-500/20", text: "text-rose-300" },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.color} p-4`}>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{c.label}</p>
          <p className={`text-lg md:text-xl font-black ${c.text} truncate`}>{c.value}</p>
          {c.sub && <p className="text-[9px] text-slate-500 mt-1 truncate">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function SortableTable({ data }: { data: DelaysByRoute[] }) {
  const [sortKey, setSortKey] = useState<keyof DelaysByRoute>("total_delays")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [search, setSearch] = useState("")

  const sorted = [...data]
    .filter(r => r.route.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      return a[sortKey] > b[sortKey] ? mul : -mul
    })

  function toggle(key: keyof DelaysByRoute) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: keyof DelaysByRoute }) {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="opacity-40" />
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text" placeholder="Buscar ruta..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-xs placeholder-slate-500 outline-none focus:border-violet-500/50"
        />
      </div>
      <div className="overflow-auto max-h-[400px] rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-black/90">
            <tr className="text-slate-400 border-b border-white/10">
              <th className="text-left p-3 cursor-pointer hover:text-white" onClick={() => toggle("route")}>
                <span className="flex items-center gap-1">Ruta <SortIcon col="route" /></span>
              </th>
              <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggle("total_delays")}>
                <span className="flex items-center justify-end gap-1">Retrasos <SortIcon col="total_delays" /></span>
              </th>
              <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggle("avg_delay_min")}>
                <span className="flex items-center justify-end gap-1">Promedio <SortIcon col="avg_delay_min" /></span>
              </th>
              <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggle("max_delay_min")}>
                <span className="flex items-center justify-end gap-1">Máximo <SortIcon col="max_delay_min" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.route} className={`border-b border-white/5 ${i % 2 ? "bg-white/[0.02]" : ""} hover:bg-white/5 transition-colors`}>
                <td className="p-3 text-white font-medium">{r.route}</td>
                <td className="p-3 text-right text-slate-300">{n(r.total_delays)}</td>
                <td className="p-3 text-right text-slate-300">{r.avg_delay_min} min</td>
                <td className="p-3 text-right text-slate-300">{r.max_delay_min} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-center text-slate-500 py-8">Sin resultados</p>}
      </div>
    </div>
  )
}

function WeatherCards({ weather, loading }: any) {
  if (loading) return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-center text-slate-500 text-xs">
      Cargando datos climáticos...
    </div>
  )
  if (!weather) return null
  const cards = [
    { label: "General", value: `${weather.overall_avg_delay} min`, sub: "Promedio general", color: "from-violet-600/20 to-purple-600/5", border: "border-violet-500/20", text: "text-violet-300" },
    { label: "Nieve", value: `${weather.snow_avg_delay} min`, sub: `vs ${weather.overall_avg_delay} min general`, color: "from-blue-600/20 to-cyan-600/5", border: "border-blue-500/20", text: "text-blue-300" },
    { label: "Lluvia", value: `${weather.rain_avg_delay} min`, sub: `vs ${weather.overall_avg_delay} min general`, color: "from-emerald-600/20 to-teal-600/5", border: "border-emerald-500/20", text: "text-emerald-300" },
    { label: "Frío (< -5°C)", value: `${weather.cold_avg_delay} min`, sub: `vs ${weather.overall_avg_delay} min general`, color: "from-cyan-600/20 to-sky-600/5", border: "border-cyan-500/20", text: "text-cyan-300" },
    { label: "Despejado", value: `${weather.clear_avg_delay} min`, sub: `vs ${weather.overall_avg_delay} min general`, color: "from-amber-600/20 to-yellow-600/5", border: "border-amber-500/20", text: "text-amber-300" },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.color} p-4`}>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{c.label}</p>
          <p className={`text-lg md:text-xl font-black ${c.text} truncate`}>{c.value}</p>
          {c.sub && <p className="text-[9px] text-slate-500 mt-1 truncate">{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [monthly, setMonthly] = useState<DelaysByMonth[]>([])
  const [routes, setRoutes] = useState<DelaysByRoute[]>([])
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => { return () => { mounted.current = false } }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [s, m, r] = await Promise.all([
        fetch(`${API_BASE}/summary`).then(r => r.json()),
        fetch(`${API_BASE}/delays-by-month`).then(r => r.json()),
        fetch(`${API_BASE}/delays-by-route`).then(r => r.json()),
      ])
      if (!mounted.current) return
      setSummary(s)
      setMonthly(m)
      setRoutes(r)
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true)
    try {
      const w = await fetch(`${API_BASE}/weather-impact`).then(r => r.json())
      if (mounted.current) setWeather(w)
    } catch {
      // ignore
    } finally {
      if (mounted.current) setWeatherLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll(); fetchWeather() }, [fetchAll, fetchWeather])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <RefreshCw className="animate-spin text-violet-400 mb-3" size={24} />
      <p className="text-slate-400 text-sm">Cargando datos...</p>
    </div>
  )

  if (error) return (
    <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm text-center">
      {error}
      <button onClick={fetchAll} className="block mx-auto mt-3 text-xs text-violet-400 hover:text-violet-300 underline">Reintentar</button>
    </div>
  )

  const chartData = monthly.map(m => ({
    label: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
    retrasos: m.total_delays,
    promedio: Number(m.avg_delay_min.toFixed(1)),
  }))

  const routeData = routes.slice(0, 15).map(r => ({
    ruta: r.route,
    retrasos: r.total_delays,
  }))

  const weatherChartData = weather?.by_weather?.slice(0, 8) || []

  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} />

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Impacto del Clima en Retrasos
        </h3>
        <WeatherCards weather={weather} loading={weatherLoading} />

        {weatherChartData.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weatherChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="weather_desc" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_delay_min" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Promedio (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Retrasos por Mes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="retrasos" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Retrasos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Top 15 Rutas con más Retrasos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={routeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis type="category" dataKey="ruta" tick={{ fill: "#64748b", fontSize: 10 }} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="retrasos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Retrasos por Ruta</h3>
        <SortableTable data={routes} />
      </div>
    </div>
  )
}
