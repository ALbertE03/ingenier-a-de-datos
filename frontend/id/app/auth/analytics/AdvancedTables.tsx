"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react"
import { IncidentCategorySummary, DelaySeverityDist, TimeSlotAnalysis, SeasonAnalysis, VehicleReliability, TopIncidentByRoute, Anomaly } from "./interfaces"

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
      const aVal = a[sortKey]; const bVal = b[sortKey]
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal
      return sortDir === "asc" ? String(aVal ?? "").localeCompare(String(bVal ?? "")) : String(bVal ?? "").localeCompare(String(aVal ?? ""))
    })
  }, [filtered, sortKey, sortDir])
  const toggleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("desc") }
  }
  return { sorted, sortKey, sortDir, toggleSort, search, setSearch }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-slate-600" />
  return dir === "asc" ? <ChevronUp size={12} className="text-violet-400" /> : <ChevronDown size={12} className="text-violet-400" />
}

function THead({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 pb-2 px-2">{children}</th>
}

function TData({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return <td className={`text-xs px-2 py-1.5 ${highlight ? "text-white font-semibold" : "text-slate-400"}`}>{children}</td>
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-3">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input type="text" placeholder="Buscar..." value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors" />
    </div>
  )
}

export function CategoryTable({ data }: { data: IncidentCategorySummary[] }) {
  const { sorted, sortKey, sortDir, toggleSort } = useSortable(data, { key: "total_delays", dir: "desc" })
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Categorías de Incidente</h4>
      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead><button onClick={() => toggleSort("category")} className="flex items-center gap-1 cursor-pointer">Categoría <SortIcon active={sortKey === "category"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("avg_delay_min")} className="flex items-center gap-1 cursor-pointer">Prom. (min) <SortIcon active={sortKey === "avg_delay_min"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("percentage")} className="flex items-center gap-1 cursor-pointer">% <SortIcon active={sortKey === "percentage"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={c.category} className={`border-t border-white/5 hover:bg-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{c.category}</TData>
                <TData>{c.total_delays.toLocaleString()}</TData>
                <TData>{c.avg_delay_min}</TData>
                <TData>{c.percentage}%</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SeverityTable({ data }: { data: DelaySeverityDist[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Distribución por Severidad</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <THead>Severidad</THead>
              <THead>Retrasos</THead>
              <THead>Prom. (min)</THead>
              <THead>%</THead>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.severity} className="border-t border-white/5 hover:bg-white/5">
                <TData highlight>{s.severity}</TData>
                <TData>{s.total_delays.toLocaleString()}</TData>
                <TData>{s.avg_delay_min}</TData>
                <TData>{s.percentage}%</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TimeSlotTable({ data }: { data: TimeSlotAnalysis[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Franjas Horarias</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <THead>Franja</THead>
              <THead>Retrasos</THead>
              <THead>Prom. (min)</THead>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.time_slot} className="border-t border-white/5 hover:bg-white/5">
                <TData highlight>{t.time_slot}</TData>
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

export function SeasonTable({ data }: { data: SeasonAnalysis[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Estaciones</h4>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <THead>Estación</THead>
              <THead>Retrasos</THead>
              <THead>Prom. (min)</THead>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.season} className="border-t border-white/5 hover:bg-white/5">
                <TData highlight>{s.season}</TData>
                <TData>{s.total_delays.toLocaleString()}</TData>
                <TData>{s.avg_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function VehicleTable({ data }: { data: VehicleReliability[] }) {
  const { sorted, sortKey, sortDir, toggleSort, search, setSearch } = useSortable(data, { key: "total_delays", dir: "desc" })
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Confiabilidad de Vehículos</h4>
      <SearchBar value={search} onChange={setSearch} />
      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead><button onClick={() => toggleSort("vehicle_number")} className="flex items-center gap-1 cursor-pointer">Vehículo <SortIcon active={sortKey === "vehicle_number"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("avg_delay_min")} className="flex items-center gap-1 cursor-pointer">Prom. (min) <SortIcon active={sortKey === "avg_delay_min"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("max_delay_min")} className="flex items-center gap-1 cursor-pointer">Máx. (min) <SortIcon active={sortKey === "max_delay_min"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => (
              <tr key={v.vehicle_number} className={`border-t border-white/5 hover:bg-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>#{v.vehicle_number}</TData>
                <TData>{v.total_delays.toLocaleString()}</TData>
                <TData>{v.avg_delay_min}</TData>
                <TData>{v.max_delay_min}</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TopIncidentsTable({ data }: { data: TopIncidentByRoute[] }) {
  const { sorted, sortKey, sortDir, toggleSort, search, setSearch } = useSortable(data, { key: "total_delays", dir: "desc" })
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Incidente Principal por Ruta</h4>
      <SearchBar value={search} onChange={setSearch} />
      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead><button onClick={() => toggleSort("route")} className="flex items-center gap-1 cursor-pointer">Ruta <SortIcon active={sortKey === "route"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("incident_type")} className="flex items-center gap-1 cursor-pointer">Incidente <SortIcon active={sortKey === "incident_type"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("total_delays")} className="flex items-center gap-1 cursor-pointer">Retrasos <SortIcon active={sortKey === "total_delays"} dir={sortDir} /></button></THead>
              <THead><button onClick={() => toggleSort("percentage")} className="flex items-center gap-1 cursor-pointer">% <SortIcon active={sortKey === "percentage"} dir={sortDir} /></button></THead>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={`${r.route}-${r.incident_type}`} className={`border-t border-white/5 hover:bg-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <TData highlight>{r.route}</TData>
                <TData>{r.incident_type}</TData>
                <TData>{r.total_delays.toLocaleString()}</TData>
                <TData>{r.percentage}%</TData>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AnomaliesTable({ data }: { data: Anomaly[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h4 className="text-sm font-bold text-white mb-3">Anomalías (Outliers)</h4>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
            <tr>
              <THead>Fecha</THead>
              <THead>Ruta</THead>
              <THead>Ubicación</THead>
              <THead>Incidente</THead>
              <THead>Dir.</THead>
              <THead>Min</THead>
              <THead>Z-Score</THead>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="text-xs text-slate-400 px-2 py-1.5">{a.report_date}</td>
                <td className="text-xs text-white font-semibold px-2 py-1.5">{a.route}</td>
                <td className="text-xs text-slate-400 px-2 py-1.5 max-w-[150px] truncate">{a.location}</td>
                <td className="text-xs text-slate-400 px-2 py-1.5 max-w-[150px] truncate">{a.incident_type}</td>
                <td className="text-xs text-slate-400 px-2 py-1.5">{a.direction || "-"}</td>
                <td className="text-xs text-red-400 font-bold px-2 py-1.5">{a.min_delay}</td>
                <td className="text-xs text-amber-400 px-2 py-1.5">{a.z_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
