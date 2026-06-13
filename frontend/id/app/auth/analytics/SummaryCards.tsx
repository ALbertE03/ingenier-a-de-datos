import { Summary } from "./interfaces"

export function SummaryCards({ summary }: { summary: Summary | null }) {
  if (!summary) return null

  const cards = [
    {
      label: "Total Registros",
      value: summary.total_records.toLocaleString(),
      sub: `${summary.total_routes} rutas · ${summary.total_locations.toLocaleString()} ubicaciones`,
      gradient: "from-violet-600/20 to-purple-600/5",
      border: "border-violet-500/20",
      text: "text-violet-300",
    },
    {
      label: "Promedio Retraso",
      value: `${summary.overall_avg_delay} min`,
      sub: `Gap prom: ${summary.overall_avg_gap} min · Máx: ${summary.max_delay} min`,
      gradient: "from-cyan-600/20 to-blue-600/5",
      border: "border-cyan-500/20",
      text: "text-cyan-300",
    },
    {
      label: "Ruta + Congestionada",
      value: summary.busiest_route || "N/A",
      sub: `${summary.total_routes} rutas activas`,
      gradient: "from-amber-600/20 to-orange-600/5",
      border: "border-amber-500/20",
      text: "text-amber-300",
    },
    {
      label: "Incidente + Común",
      value: summary.most_common_incident || "N/A",
      sub: `${summary.total_incident_types} tipos de incidente`,
      gradient: "from-rose-600/20 to-pink-600/5",
      border: "border-rose-500/20",
      text: "text-rose-300",
    },
    {
      label: "Ubicaciones",
      value: summary.total_locations.toLocaleString(),
      sub: "Puntos de retraso en la red",
      gradient: "from-emerald-600/20 to-green-600/5",
      border: "border-emerald-500/20",
      text: "text-emerald-300",
    },
    {
      label: "Vehículos",
      value: summary.total_vehicles.toLocaleString(),
      sub: "Tranvías en operación",
      gradient: "from-indigo-600/20 to-violet-600/5",
      border: "border-indigo-500/20",
      text: "text-indigo-300",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} p-4 transition-all duration-300 hover:scale-[1.02]`}
        >
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{card.label}</p>
          <p className={`text-lg md:text-xl font-black ${card.text} truncate`}>{card.value}</p>
          {card.sub && <p className="text-[9px] text-slate-500 mt-1 truncate leading-tight">{card.sub}</p>}
        </div>
      ))}
    </div>
  )
}
