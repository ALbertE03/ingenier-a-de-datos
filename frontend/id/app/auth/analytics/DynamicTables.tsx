"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react"
import { DelaysByRoute, DelaysByType, DelaysByMonth, DelaysByDay, WorstLocation } from "./interfaces"

type SortDir = "asc" | "desc"

function useSortable<T>(data: T[], defaultSort: { key: keyof T; dir: SortDir }) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultSort.key)
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort.dir)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return data
    return data.filter((item) =>
      Object.values(item as any).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [data, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal ?? "")
      const bStr = String(bVal ?? "")
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  return { sorted, sortKey, sortDir, toggleSort, search, setSearch }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-slate-600" />
  return dir === "asc" ? <ChevronUp size={12} className="text-violet-400" /> : <ChevronDown size={12} className="text-violet-400" />
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-3">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        placeholder="Buscar..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
      />
    </div>
  )
}

function THead({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 pb-2 px-2">{children}</th>
}

function TData({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return <td className={`text-xs px-2 py-1.5 ${highlight ? "text-white font-semibold" : "text-slate-400"}`}>{children}</td>
}

export function RoutesTable({ data }: { data: DelaysByRoute[] }) {
  const { sorted, sortKey, sortDir, toggleSort, search, setSearch } = useSortable(data, { key: "total_delays", dir: "desc" })
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Tabla de Rutas</h4>
      <SearchBar value={search} onChange={setSearch} />
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead><button onClick={() => toggleSort("route")} className="flex items-center gap-1 cursor-pointer">Ruta <SortIcon active={sortKey === "route"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("avg_delay_min")} className="flex items-center gap-1 cursor-pointer">Prom. (min) <SortIcon active={sortKey === "avg_delay_min"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("max_delay_min")} className="flex items-center gap-1 cursor-pointer">Máx. (min) <SortIcon active={sortKey === "max_delay_min"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.route} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{r.route}</TData>
                <TData>{r.total_delays.toLocaleString()}</TData>
                <TData>{r.avg_delay_min}</TData>
                <TData>{r.max_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function IncidentTypeTable({ data }: { data: DelaysByType[] }) {
  const { sorted, sortKey, sortDir, toggleSort, search, setSearch } = useSortable(data, { key: "total_delays", dir: "desc" })
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Tabla de Tipos de Incidente</h4>
      <SearchBar value={search} onChange={setSearch} />
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead><button onClick={() => toggleSort("incident_type")} className="flex items-center gap-1 cursor-pointer">Tipo <SortIcon active={sortKey === "incident_type"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("avg_delay_min")} className="flex items-center gap-1 cursor-pointer">Prom. (min) <SortIcon active={sortKey === "avg_delay_min"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={t.incident_type} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{t.incident_type}</TData>
                <TData>{t.total_delays.toLocaleString()}</TData>
                <TData>{t.avg_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MonthlyTable({ data }: { data: DelaysByMonth[] }) {
  const { sorted, sortKey, sortDir, toggleSort, search, setSearch } = useSortable(data, { key: "year", dir: "desc" })
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Tabla Mensual</h4>
      <SearchBar value={search} onChange={setSearch} />
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead><button onClick={() => toggleSort("year")} className="flex items-center gap-1 cursor-pointer">Año <SortIcon active={sortKey === "year"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("month")} className="flex items-center gap-1 cursor-pointer">Mes <SortIcon active={sortKey === "month"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("avg_delay_min")} className="flex items-center gap-1 cursor-pointer">Prom. (min) <SortIcon active={sortKey === "avg_delay_min"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={`${m.year}-${m.month}`} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{m.year}</TData>
                <TData>{monthNames[m.month - 1]}</TData>
                <TData>{m.total_delays.toLocaleString()}</TData>
                <TData>{m.avg_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DayOfWeekTable({ data }: { data: DelaysByDay[] }) {
  const dayNamesES: Record<string, string> = {
    "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
    "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo",
  }
  const dayOrder: Record<string, number> = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6,
  }
  const sorted = [...data].sort((a, b) => (dayOrder[a.day] ?? 0) - (dayOrder[b.day] ?? 0))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Día de la Semana</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <THead>Día</THead>
              <THead>Retrasos</THead>
              <THead>Prom. (min)</THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr key={d.day} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{dayNamesES[d.day] || d.day}</TData>
                <TData>{d.total_delays.toLocaleString()}</TData>
                <TData>{d.avg_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function LocationsTable({ data }: { data: WorstLocation[] }) {
  const { sorted, sortKey, sortDir, toggleSort, search, setSearch } = useSortable(data, { key: "total_delays", dir: "desc" })
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Ubicaciones Críticas</h4>
      <SearchBar value={search} onChange={setSearch} />
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead>#</THead>
              <THead><button onClick={() => toggleSort("location")} className="flex items-center gap-1 cursor-pointer">Ubicación <SortIcon active={sortKey === "location"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("avg_delay_min")} className="flex items-center gap-1 cursor-pointer">Prom. (min) <SortIcon active={sortKey === "avg_delay_min"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((loc, i) => (
              <tr key={loc.location} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData>#{i + 1}</TData>
                <TData highlight>{loc.location}</TData>
                <TData>{loc.total_delays.toLocaleString()}</TData>
                <TData>{loc.avg_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DirectionTable({ data }: { data: { direction: string; avg_delay_min: number; total_delays: number }[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Retrasos por Dirección</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <THead>Dirección</THead>
              <THead>Retrasos</THead>
              <THead>Prom. (min)</THead>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.direction} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{d.direction === "E" ? "Este" : d.direction === "W" ? "Oeste" : d.direction}</TData>
                <TData>{d.total_delays.toLocaleString()}</TData>
                <TData>{d.avg_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function YearOverYearTable({ data }: { data: { year: number; total_delays: number; avg_delay_min: number }[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Comparativa Anual</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <THead>Año</THead>
              <THead>Retrasos</THead>
              <THead>Prom. (min)</THead>
              <THead>Cambio</THead>
            </tr>
          </thead>
          <tbody>
            {data.map((y, i) => {
              const prev = i > 0 ? data[i - 1].total_delays : null
              const change = prev ? (((y.total_delays - prev) / prev) * 100).toFixed(1) : null
              return (
                <tr key={y.year} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                  <TData highlight>{y.year}</TData>
                  <TData>{y.total_delays.toLocaleString()}</TData>
                  <TData>{y.avg_delay_min}</TData>
                  <TData>
                    {change && (
                      <span className={Number(change) > 0 ? "text-red-400" : "text-green-400"}>
                        {Number(change) > 0 ? "+" : ""}{change}%
                      </span>
                    )}
                  </TData>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
