"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, ZoomControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { AlertTriangle } from "lucide-react"

interface LocationPoint {
  id: number
  name: string
  total_delays: number
  avg_delay_min: number
  latitude: number | null
  longitude: number | null
}

interface RouteLocation {
  location_id: number
  location_name: string
  latitude: number | null
  longitude: number | null
  total_delays: number
  avg_delay_min: number
}

interface RouteNetwork {
  [route: string]: {
    locations: RouteLocation[]
    total_delays: number
  }
}

const API_BASE = "http://localhost:8000/api/v1/analytics"
const TORONTO_CENTER: [number, number] = [43.6532, -79.3832]

function delayRadius(delays: number): number {
  return Math.max(6, Math.min(30, Math.sqrt(delays) * 1.5))
}

function delayOpacity(delays: number, max: number): number {
  return 0.4 + (delays / max) * 0.6
}

function severityColor(avg_min: number): string {
  if (avg_min <= 10) return "#10b981"
  if (avg_min <= 15) return "#f59e0b"
  if (avg_min <= 25) return "#f97316"
  if (avg_min <= 50) return "#ef4444"
  return "#dc2626"
}

export function LocationsMap() {
  const [locations, setLocations] = useState<LocationPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_BASE}/locations-with-coords?limit=100&geocode=true`)
        if (!res.ok) throw new Error("Error al cargar ubicaciones")
        const data = await res.json()
        setLocations(data.filter((l: LocationPoint) => l.latitude && l.longitude))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error")
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [])

  const maxDelays = Math.max(...locations.map((l) => l.total_delays), 1)

  if (loading) return <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400 text-sm">Cargando mapa...</div>
  if (error) return <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs"><AlertTriangle size={14} />{error}</div>

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-3 bg-white/5 border-b border-white/10">
        <h4 className="text-sm font-bold text-white">Mapa de Retrasos — Toronto</h4>
        <p className="text-[10px] text-slate-500">{locations.length} ubicaciones con coordenadas</p>
      </div>
      <div className="h-[500px] w-full">
        <MapContainer center={TORONTO_CENTER} zoom={12} zoomControl={false} className="h-full w-full" style={{ background: "#1a1a2e" }}>
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc) => (
            <CircleMarker
              key={loc.id}
              center={[loc.latitude!, loc.longitude!]}
              radius={delayRadius(loc.total_delays)}
              pathOptions={{
                color: severityColor(loc.avg_delay_min),
                fillColor: severityColor(loc.avg_delay_min),
                fillOpacity: delayOpacity(loc.total_delays, maxDelays),
                weight: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <strong>{loc.name}</strong>
              </Tooltip>
              <Popup>
                <div className="text-xs font-sans min-w-[150px]">
                  <p className="font-bold text-base mb-1">{loc.name}</p>
                  <p>Retrasos: <strong>{loc.total_delays.toLocaleString()}</strong></p>
                  <p>Promedio: <strong>{loc.avg_delay_min} min</strong></p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="p-2 bg-white/5 border-t border-white/10 flex gap-3 text-[10px] text-slate-500 items-center">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;10 min</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 10–15</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 15–25</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 25–50</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> &gt;50 min</span>
        <span className="ml-auto">Tamaño = cantidad de retrasos</span>
      </div>
    </div>
  )
}

export function RouteNetworkMap() {
  const [network, setNetwork] = useState<RouteNetwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const res = await fetch(`${API_BASE}/route-network?top_routes=8&top_locations_per_route=10`)
        if (!res.ok) throw new Error("Error al cargar red de rutas")
        setNetwork(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error")
      } finally {
        setLoading(false)
      }
    }
    fetchNetwork()
  }, [])

  if (loading) return <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400 text-sm">Cargando rutas...</div>
  if (error) return <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs"><AlertTriangle size={14} />{error}</div>
  if (!network) return null

  const allCoords: [number, number][] = []
  const routeColors = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#6366f1", "#14b8a6", "#e11d48"]

  const routeEntries = Object.entries(network)
  const maxDelays = Math.max(...routeEntries.map(([, v]) => v.total_delays), 1)

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-3 bg-white/5 border-b border-white/10">
        <h4 className="text-sm font-bold text-white">Red de Rutas — Top 8</h4>
        <p className="text-[10px] text-slate-500">Cada color representa una ruta de tranvía</p>
      </div>
      <div className="h-[500px] w-full">
        <MapContainer center={TORONTO_CENTER} zoom={12} zoomControl={false} className="h-full w-full" style={{ background: "#1a1a2e" }}>
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeEntries.map(([route, data], ri) => {
            const coords = data.locations
              .filter((l) => l.latitude && l.longitude)
              .map((l) => [l.latitude!, l.longitude!] as [number, number])
            allCoords.push(...coords)
            const color = routeColors[ri % routeColors.length]

            return (
              <div key={route}>
                {data.locations.filter((l) => l.latitude).map((loc, li) => (
                  <CircleMarker
                    key={`${route}-${li}`}
                    center={[loc.latitude!, loc.longitude!]}
                    radius={Math.max(5, Math.sqrt(loc.total_delays) * 0.8)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 1 }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      <strong>{route}</strong>: {loc.location_name}
                    </Tooltip>
                    <Popup>
                      <div className="text-xs font-sans min-w-[150px]">
                        <p className="font-bold">{route}</p>
                        <p className="mb-1">{loc.location_name}</p>
                        <p>Retrasos: <strong>{loc.total_delays.toLocaleString()}</strong></p>
                        <p>Promedio: <strong>{loc.avg_delay_min} min</strong></p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </div>
            )
          })}
        </MapContainer>
      </div>
      <div className="p-2 bg-white/5 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-[10px] items-center">
        {routeEntries.map(([route, data], ri) => (
          <span key={route} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: routeColors[ri % routeColors.length] }} />
            {route} <span className="text-slate-600">({data.total_delays.toLocaleString()})</span>
          </span>
        ))}
      </div>
    </div>
  )
}
