"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Incident } from "../interfaces"
import { AlertTriangle, CheckCircle, Plus, X } from "lucide-react"

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/incidents`

const INCIDENT_TYPES = [
  "Accidente", "Falla mecánica", "Problema de ruta", "Queja de pasajero",
  "Condiciones climáticas", "Obra en vía", "Otro",
]

export function IncidentDashboard({ token }: { token: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0])
  const [description, setDescription] = useState("")
  const [routeCode, setRouteCode] = useState("")
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const mounted = useRef(true)
  useEffect(() => { return () => { mounted.current = false } }, [])

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const fetchIncidents = useCallback(async () => {
    try {
      const url = statusFilter ? `${API}?status_filter=${statusFilter}` : API
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error("Error al cargar incidentes")
      const data = await res.json()
      if (mounted.current) setIncidents(data)
    } catch (e) {
      console.error(e)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    try {
      const res = await fetch(API, {
        method: "POST",
        headers,
        body: JSON.stringify({
          incident_type: incidentType,
          description: description || null,
          route_code: routeCode || null,
          report_date: reportDate,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || "Error al crear incidente")
      }
      setShowForm(false)
      setDescription("")
      setRouteCode("")
      setIncidentType(INCIDENT_TYPES[0])
      setReportDate(new Date().toISOString().split("T")[0])
      fetchIncidents()
    } catch (e: any) {
      setError(e.message)
    } finally {
      if (mounted.current) setCreating(false)
    }
  }

  const handleResolve = async (id: number) => {
    try {
      const res = await fetch(`${API}/${id}/resolve`, { method: "PATCH", headers })
      if (res.ok) fetchIncidents()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
      <p className="text-slate-400 text-sm mt-3">Cargando incidentes...</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          Incidentes Reportados
          <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
            {incidents.length}
          </span>
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cerrar" : "Nuevo Incidente"}
        </button>
      </div>

      <div className="flex gap-2">
        {[null, "open", "resolved"].map(s => (
          <button
            key={String(s)}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
              statusFilter === s
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {s === null ? "Todos" : s === "open" ? "Abiertos" : "Resueltos"}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
          <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider">Reportar Nuevo Incidente</h4>

          {error && (
            <div className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Tipo</label>
              <select
                value={incidentType}
                onChange={e => setIncidentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-xs outline-none focus:border-violet-500/50"
              >
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Fecha del Reporte</label>
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-xs outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Ruta (opcional)</label>
            <input
              type="text"
              value={routeCode}
              onChange={e => setRouteCode(e.target.value)}
              placeholder="ej. 501"
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-xs placeholder-slate-500 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe el incidente..."
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-xs placeholder-slate-500 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {creating ? "Creando..." : "Crear Incidente"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {incidents.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-slate-500 text-xs">
            No hay incidentes
          </div>
        ) : (
          incidents.map(inc => (
            <div
              key={inc.id}
              className={`rounded-2xl border p-4 bg-black/40 ${
                inc.status === "resolved" ? "border-emerald-500/10" : "border-amber-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      inc.status === "resolved"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                    }`}>
                      {inc.status}
                    </span>
                    <span className="text-xs font-bold text-white truncate">{inc.incident_type}</span>
                    {inc.route && (
                      <span className="text-[10px] text-slate-400">Ruta {inc.route}</span>
                    )}
                  </div>
                  {inc.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">{inc.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-500">
                    <span>{inc.created_by}</span>
                    <span>{inc.report_date}</span>
                    {inc.resolved_at && <span>Resuelto: {inc.resolved_at}</span>}
                  </div>
                </div>
                {inc.status === "open" && (
                  <button
                    onClick={() => handleResolve(inc.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    title="Resolver incidente"
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
