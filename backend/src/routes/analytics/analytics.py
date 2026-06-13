from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, desc, case, extract
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import asyncio

from src.db.session import get_db
from src.db.models import DelayRecord, Route, Location, LocationCoordinate, IncidentType, IncidentCategory, Vehicle
from src.routes.schemas.schemas_analytics import (
    DelaysByRoute, DelaysByType, DelaysByMonth,
    DelaysByDay, WorstLocation, Summary,
    DeepAnalysis, DirectionAnalysis, YearOverYear,
    PeakHour, IncidentSeverity,
    IncidentCategorySummary, DelaySeverityDist, TimeSlotAnalysis,
    SeasonAnalysis, VehicleReliability, DelayDistribution,
    RouteTrend, CorrelationAnalysis, RouteDirectionAnalysis,
    TopIncidentByRoute, HourlyHeatmap, Anomaly,
    LocationWithCoords, RouteNetworkNode, RouteNetworkLink,
    RouteMapData,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])




@router.get(
    "/summary",
    response_model=Summary,
    summary="Resumen general del dataset",
    description="Métricas globales: total de registros, rutas, ubicaciones, incidentes, vehículos, promedios de retraso y gap, retraso máximo, ruta más congestionada e incidente más común.",
)
async def get_summary(db: AsyncSession = Depends(get_db)):
    total_records = (await db.execute(select(func.count(DelayRecord.id)))).scalar()
    total_routes = (await db.execute(select(func.count(Route.id)))).scalar()
    total_locations = (await db.execute(select(func.count(Location.id)))).scalar()
    total_incident_types = (await db.execute(select(func.count(IncidentType.id)))).scalar()
    total_vehicles = (await db.execute(select(func.count(Vehicle.id)))).scalar()
    avg_delay = (await db.execute(select(func.avg(DelayRecord.min_delay)))).scalar()
    avg_gap = (await db.execute(select(func.avg(DelayRecord.min_gap)))).scalar()
    max_delay = (await db.execute(select(func.max(DelayRecord.min_delay)))).scalar()

    busiest_route = (
        await db.execute(
            select(Route.code)
            .join(DelayRecord)
            .group_by(Route.code)
            .order_by(desc(func.count(DelayRecord.id)))
            .limit(1)
        )
    ).scalar()

    most_common_incident = (
        await db.execute(
            select(IncidentType.name)
            .join(DelayRecord)
            .group_by(IncidentType.name)
            .order_by(desc(func.count(DelayRecord.id)))
            .limit(1)
        )
    ).scalar()

    return Summary(
        total_records=total_records or 0,
        total_routes=total_routes or 0,
        total_locations=total_locations or 0,
        total_incident_types=total_incident_types or 0,
        total_vehicles=total_vehicles or 0,
        overall_avg_delay=round(float(avg_delay or 0), 2),
        overall_avg_gap=round(float(avg_gap or 0), 2),
        max_delay=int(max_delay or 0),
        busiest_route=busiest_route,
        most_common_incident=most_common_incident,
    )


@router.get(
    "/delays-by-route",
    response_model=list[DelaysByRoute],
    summary="Retrasos por ruta",
    description="Lista todas las rutas de tranvía ordenadas por cantidad de retrasos. Incluye total de retrasos, promedio y máximo de minutos por retraso.",
)
async def get_delays_by_route(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200, description="Cantidad máxima de rutas a retornar"),
    min_delays: int = Query(0, ge=0, description="Filtro mínimo de retrasos"),
):
    query = (
        select(
            Route.code,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
            func.max(DelayRecord.min_delay).label("max_delay"),
        )
        .join(Route, DelayRecord.route_id == Route.id)
        .group_by(Route.code)
        .having(func.count(DelayRecord.id) >= min_delays)
        .order_by(desc("total_delays"))
        .limit(limit)
    )
    rows = (await db.execute(query)).all()
    return [
        DelaysByRoute(route=r.code, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2), max_delay_min=int(r.max_delay or 0))
        for r in rows
    ]


@router.get(
    "/delays-by-type",
    response_model=list[DelaysByType],
    summary="Retrasos por tipo de incidente",
    description="Cada tipo de incidente con su total de retrasos y promedio de minutos. Los tipos se descubren automáticamente desde los datos CSV.",
)
async def get_delays_by_type(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
):
    query = (
        select(
            IncidentType.name,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
        .group_by(IncidentType.name)
        .order_by(desc("total_delays"))
        .limit(limit)
    )
    rows = (await db.execute(query)).all()
    return [
        DelaysByType(incident_type=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]



@router.get(
    "/delays-by-month",
    response_model=list[DelaysByMonth],
    summary="Retrasos por mes",
    description="Serie temporal mensual con total de retrasos y promedio de minutos. Útil para ver tendencias estacionales y año contra año.",
)
async def get_delays_by_month(
    db: AsyncSession = Depends(get_db),
    year: int | None = Query(None, ge=2014, le=2025, description="Filtrar por año específico"),
):
    query = (
        select(
            func.extract("year", DelayRecord.report_date).label("year"),
            func.extract("month", DelayRecord.report_date).label("month"),
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
    )
    if year:
        query = query.where(func.extract("year", DelayRecord.report_date) == year)
    query = query.group_by(func.extract("year", DelayRecord.report_date), func.extract("month", DelayRecord.report_date)).order_by(func.extract("year", DelayRecord.report_date), func.extract("month", DelayRecord.report_date))
    rows = (await db.execute(query)).all()
    return [
        DelaysByMonth(year=int(r.year), month=int(r.month), total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]



@router.get(
    "/delays-by-day",
    response_model=list[DelaysByDay],
    summary="Retrasos por día de la semana",
    description="Agregación por día de la semana (Monday–Sunday) con total de retrasos y promedio de minutos por día.",
)
async def get_delays_by_day(db: AsyncSession = Depends(get_db)):
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    query = (
        select(
            DelayRecord.day,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .where(DelayRecord.day.isnot(None))
        .group_by(DelayRecord.day)
        .order_by(case(*[(DelayRecord.day == d, i) for i, d in enumerate(day_order)]))
    )
    rows = (await db.execute(query)).all()
    return [
        DelaysByDay(day=r.day, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]



@router.get(
    "/worst-locations",
    response_model=list[WorstLocation],
    summary="Ubicaciones con más retrasos",
    description="Top ubicaciones (intersecciones/paradas) con mayor cantidad de retrasos registrados. Incluye coordenadas geográficas si están disponibles.",
)
async def get_worst_locations(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    query = (
        select(
            Location.name,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .join(Location, DelayRecord.location_id == Location.id)
        .group_by(Location.name)
        .order_by(desc("total_delays"))
        .limit(limit)
    )
    rows = (await db.execute(query)).all()
    return [
        WorstLocation(location=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]



@router.get(
    "/deep-analysis",
    response_model=DeepAnalysis,
    summary="Análisis profundo multidimensional",
    description="Insights avanzados: ruta con mayor promedio de retraso, peor día, mes pico, horas totales de retraso, análisis por dirección, tendencia anual, horas pico y severidad por tipo de incidente.",
)
async def get_deep_analysis(db: AsyncSession = Depends(get_db)):
    route_avg = (
        await db.execute(
            select(
                Route.code, func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
                func.max(DelayRecord.min_delay).label("max_delay"),
            )
            .join(Route, DelayRecord.route_id == Route.id)
            .group_by(Route.code).order_by(desc("avg_delay")).limit(1)
        )
    ).first()

    worst_day = (
        await db.execute(
            select(DelayRecord.day).group_by(DelayRecord.day).order_by(desc(func.count(DelayRecord.id))).limit(1)
        )
    ).scalar()

    month_top = (
        await db.execute(
            select(
                func.extract("year", DelayRecord.report_date).label("year"),
                func.extract("month", DelayRecord.report_date).label("month"),
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
            ).group_by(func.extract("year", DelayRecord.report_date), func.extract("month", DelayRecord.report_date)).order_by(desc("total_delays")).limit(1)
        )
    ).first()

    total_minutes = (await db.execute(select(func.coalesce(func.sum(DelayRecord.min_delay), 0)))).scalar()

    dir_rows = (await db.execute(
        select(DelayRecord.normalized_direction, func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .where(DelayRecord.normalized_direction.isnot(None)).group_by(DelayRecord.normalized_direction).order_by(desc("total_delays"))
    )).all()

    yoy = (await db.execute(
        select(func.extract("year", DelayRecord.report_date).label("year"), func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .group_by(func.extract("year", DelayRecord.report_date)).order_by(func.extract("year", DelayRecord.report_date))
    )).all()

    peak_rows = (await db.execute(
        select(func.extract("hour", DelayRecord.time).label("hour"), func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .where(DelayRecord.time.isnot(None)).group_by(func.extract("hour", DelayRecord.time)).order_by(desc("total_delays"))
    )).all()

    severity_rows = (await db.execute(
        select(IncidentType.name, func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
        .group_by(IncidentType.name).order_by(desc("avg_delay"))
    )).all()

    return DeepAnalysis(
        route_with_highest_avg_delay=DelaysByRoute(
            route=route_avg.code, total_delays=route_avg.total_delays,
            avg_delay_min=round(float(route_avg.avg_delay or 0), 2), max_delay_min=int(route_avg.max_delay or 0),
        ) if route_avg else None,
        worst_day_for_delays=worst_day,
        month_with_most_delays=DelaysByMonth(
            year=int(month_top.year), month=int(month_top.month),
            total_delays=month_top.total_delays, avg_delay_min=round(float(month_top.avg_delay or 0), 2),
        ) if month_top else None,
        total_delay_hours=round(float(total_minutes or 0) / 60, 2),
        avg_delay_by_direction=[DirectionAnalysis(direction=r.normalized_direction, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in dir_rows],
        year_over_year_trend=[YearOverYear(year=int(r.year), total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in yoy],
        peak_hour_analysis=[PeakHour(hour=f"{int(r.hour):02d}:00", total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in peak_rows],
        incident_type_severity=[IncidentSeverity(incident_type=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in severity_rows],
    )



@router.get(
    "/incident-categories",
    response_model=list[IncidentCategorySummary],
    summary="Categorías de incidente (auto-descubiertas)",
    description="Categorías generadas automáticamente mediante clustering por n-gramas de los nombres de incidente en los CSV. Muestra total, promedio y porcentaje sobre el total.",
)
async def get_incident_categories(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(DelayRecord.id)))).scalar() or 1
    rows = (await db.execute(
        select(
            IncidentCategory.name, func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .select_from(DelayRecord)
        .join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
        .join(IncidentCategory, IncidentType.category_id == IncidentCategory.id)
        .group_by(IncidentCategory.name).order_by(desc("total_delays"))
    )).all()
    return [IncidentCategorySummary(category=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2), percentage=round(r.total_delays / total * 100, 2)) for r in rows]


@router.get(
    "/delay-severity",
    response_model=list[DelaySeverityDist],
    summary="Distribución por severidad",
    description="Clasificación automática de retrasos en 5 niveles de severidad: Minor (≤5min), Moderate (≤15), Significant (≤30), Severe (≤60), Critical (>60). Incluye porcentaje sobre el total.",
)
async def get_delay_severity(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(DelayRecord.id)))).scalar() or 1
    severity_order = ["Minor", "Moderate", "Significant", "Severe", "Critical"]
    rows = (await db.execute(
        select(
            DelayRecord.delay_severity, func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .where(DelayRecord.delay_severity.isnot(None))
        .group_by(DelayRecord.delay_severity)
        .order_by(case(*[(DelayRecord.delay_severity == s, i) for i, s in enumerate(severity_order)]))
    )).all()
    return [DelaySeverityDist(severity=r.delay_severity, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2), percentage=round(r.total_delays / total * 100, 2)) for r in rows]


@router.get(
    "/time-slots",
    response_model=list[TimeSlotAnalysis],
    summary="Retrasos por franja horaria",
    description="Agregación en 7 franjas: Late Night (0–6), Morning Peak (6–10), Late Morning (10–12), Midday (12–14), Afternoon Peak (14–16), Evening (16–19), Night (19–24).",
)
async def get_time_slots(db: AsyncSession = Depends(get_db)):
    slot_order = ["Late Night", "Morning Peak", "Late Morning", "Midday", "Afternoon Peak", "Evening", "Night"]
    rows = (await db.execute(
        select(DelayRecord.time_slot, func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .where(DelayRecord.time_slot.isnot(None)).group_by(DelayRecord.time_slot)
        .order_by(case(*[(DelayRecord.time_slot == s, i) for i, s in enumerate(slot_order)]))
    )).all()
    return [TimeSlotAnalysis(time_slot=r.time_slot, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in rows]



@router.get(
    "/seasons",
    response_model=list[SeasonAnalysis],
    summary="Retrasos por estación",
    description="Distribución de retrasos por estación del año (Winter, Spring, Summer, Fall) calculada desde la fecha del reporte.",
)
async def get_seasons(db: AsyncSession = Depends(get_db)):
    season_order = ["Winter", "Spring", "Summer", "Fall"]
    rows = (await db.execute(
        select(DelayRecord.season, func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .where(DelayRecord.season.isnot(None)).group_by(DelayRecord.season)
        .order_by(case(*[(DelayRecord.season == s, i) for i, s in enumerate(season_order)]))
    )).all()
    return [SeasonAnalysis(season=r.season, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in rows]



@router.get(
    "/delay-distribution",
    response_model=list[DelayDistribution],
    summary="Distribución de duración de retrasos",
    description="Histograma con 6 rangos: 0–5min, 5–15, 15–30, 30–60, 1–2hrs, >2hrs. Incluye conteo y porcentaje.",
)
async def get_delay_distribution(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(DelayRecord.id)))).scalar() or 1
    bins = [(0, 5, "0-5 min"), (5, 15, "5-15 min"), (15, 30, "15-30 min"), (30, 60, "30-60 min"), (60, 120, "1-2 hrs"), (120, 9999, ">2 hrs")]
    results = []
    for lo, hi, label in bins:
        cnt = (await db.execute(select(func.count(DelayRecord.id)).where(DelayRecord.min_delay >= lo, DelayRecord.min_delay < hi))).scalar()
        avg = (await db.execute(select(func.avg(DelayRecord.min_delay)).where(DelayRecord.min_delay >= lo, DelayRecord.min_delay < hi))).scalar()
        results.append(DelayDistribution(range_label=label, min_val=lo, max_val=hi if hi < 9999 else 9999, count=cnt or 0, percentage=round((cnt or 0) / total * 100, 2)))
    return results



@router.get(
    "/vehicle-reliability",
    response_model=list[VehicleReliability],
    summary="Vehículos con más retrasos",
    description="Ranking de vehículos (tranvías) por cantidad de retrasos. Útil para identificar unidades problemáticas.",
)
async def get_vehicle_reliability(db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100)):
    rows = (await db.execute(
        select(Vehicle.vehicle_number, func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"), func.max(DelayRecord.min_delay).label("max_delay"))
        .join(Vehicle, DelayRecord.vehicle_id == Vehicle.id).group_by(Vehicle.vehicle_number).order_by(desc("total_delays")).limit(limit)
    )).all()
    return [VehicleReliability(vehicle_number=r.vehicle_number, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2), max_delay_min=int(r.max_delay or 0)) for r in rows]



@router.get(
    "/route-trends",
    response_model=list[RouteTrend],
    summary="Tendencia anual por ruta",
    description="Evolución año a año de retrasos por ruta. Permite filtrar por ruta y año específicos para análisis comparativo.",
)
async def get_route_trends(db: AsyncSession = Depends(get_db), route: str | None = Query(None, description="Código de ruta"), year: int | None = Query(None, ge=2014, le=2025)):
    query = (
        select(Route.code, func.extract("year", DelayRecord.report_date).label("year"), func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .join(Route, DelayRecord.route_id == Route.id)
    )
    if route: query = query.where(Route.code == route)
    if year: query = query.where(func.extract("year", DelayRecord.report_date) == year)
    query = query.group_by(Route.code, func.extract("year", DelayRecord.report_date)).order_by(Route.code, func.extract("year", DelayRecord.report_date))
    rows = (await db.execute(query)).all()
    return [RouteTrend(route=r.code, year=int(r.year), total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in rows]


@router.get(
    "/direction-heatmap",
    response_model=list[RouteDirectionAnalysis],
    summary="Retrasos por ruta y dirección",
    description="Matriz ruta × dirección cardinal (E/W/N/S/B) para identificar patrones direccionales de retraso en cada ruta.",
)
async def get_direction_heatmap(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(Route.code, DelayRecord.normalized_direction, func.count(DelayRecord.id).label("total_delays"), func.avg(DelayRecord.min_delay).label("avg_delay"))
        .join(Route, DelayRecord.route_id == Route.id).where(DelayRecord.normalized_direction.isnot(None))
        .group_by(Route.code, DelayRecord.normalized_direction).order_by(desc("total_delays"))
    )).all()
    return [RouteDirectionAnalysis(route=r.code, direction=r.normalized_direction, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2)) for r in rows]



@router.get(
    "/top-incidents-by-route",
    response_model=list[TopIncidentByRoute],
    summary="Incidente más frecuente por ruta",
    description="Para cada ruta, el tipo de incidente más común y su porcentaje sobre el total de retrasos de esa ruta.",
)
async def get_top_incidents_by_route(db: AsyncSession = Depends(get_db), limit: int = Query(30, ge=1, le=100)):
    subq = (
        select(Route.code.label("route"), IncidentType.name.label("incident_type"), func.count(DelayRecord.id).label("total_delays"))
        .join(Route, DelayRecord.route_id == Route.id).join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
        .group_by(Route.code, IncidentType.name).order_by(Route.code, desc("total_delays"))
    ).subquery()
    tot = select(subq.c.route, func.sum(subq.c.total_delays).label("route_total")).group_by(subq.c.route).cte("tot")
    ranked = select(subq.c.route, subq.c.incident_type, subq.c.total_delays, tot.c.route_total, func.row_number().over(partition_by=subq.c.route, order_by=desc(subq.c.total_delays)).label("rn")).join(tot, subq.c.route == tot.c.route).cte("r")
    rows = (await db.execute(select(ranked).where(ranked.c.rn == 1).order_by(desc(ranked.c.total_delays)).limit(limit))).all()
    return [TopIncidentByRoute(route=r.route, incident_type=r.incident_type, total_delays=r.total_delays, percentage=round(r.total_delays / r.route_total * 100, 2)) for r in rows]



@router.get(
    "/day-hour-heatmap",
    response_model=list[HourlyHeatmap],
    summary="Mapa de calor día × hora",
    description="Matriz 7×24 de retrasos: combinación día de la semana × hora del día. Revela patrones semanales y horas pico.",
)
async def get_day_hour_heatmap(db: AsyncSession = Depends(get_db)):
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    rows = (await db.execute(
        select(DelayRecord.day, func.extract("hour", DelayRecord.time).label("hour"), func.count(DelayRecord.id).label("total_delays"))
        .where(DelayRecord.time.isnot(None), DelayRecord.day.isnot(None)).group_by(DelayRecord.day, "hour")
        .order_by(case(*[(DelayRecord.day == d, i) for i, d in enumerate(day_order)]), "hour")
    )).all()
    return [HourlyHeatmap(day=r.day, hour=int(r.hour), total_delays=r.total_delays) for r in rows]



@router.get(
    "/anomalies",
    response_model=list[Anomaly],
    summary="Eventos anómalos (outliers)",
    description="Detección estadística de anomalías: registros con z-score ≥ threshold (default 3.0) respecto a la media de min_delay. Identifica retrasos extremadamente largos.",
)
async def get_anomalies(db: AsyncSession = Depends(get_db), threshold: float = Query(3.0, ge=1.0, description="Umbral de z-score"), limit: int = Query(50, ge=1, le=200)):
    stats = (await db.execute(select(func.avg(DelayRecord.min_delay).label("mean"), func.stddev(DelayRecord.min_delay).label("stddev")))).first()
    mean, stddev = (float(stats.mean or 0), float(stats.stddev or 1))
    if stddev < 0.01: return []
    rows = (await db.execute(
        select(DelayRecord.id, DelayRecord.report_date, Route.code, Location.name, IncidentType.name, DelayRecord.min_delay, DelayRecord.normalized_direction)
        .join(Route, DelayRecord.route_id == Route.id).join(Location, DelayRecord.location_id == Location.id).join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
        .where(func.abs((DelayRecord.min_delay - mean) / stddev) >= threshold).order_by(desc(DelayRecord.min_delay)).limit(limit)
    )).all()
    return [Anomaly(id=r.id, report_date=str(r.report_date), route=r.code, location=r.name, incident_type=r.name_1, min_delay=r.min_delay, direction=r.normalized_direction, z_score=round(abs((r.min_delay - mean) / stddev), 2)) for r in rows]



@router.get(
    "/correlation",
    response_model=CorrelationAnalysis,
    summary="Correlación entre retraso y gap",
    description="Coeficiente de correlación de Pearson entre min_delay y min_gap. Indica si retrasos más largos tienden a producir gaps más grandes.",
)
async def get_correlation(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(DelayRecord.min_delay, DelayRecord.min_gap).where(DelayRecord.min_delay.isnot(None), DelayRecord.min_gap.isnot(None)).limit(10000))).all()
    delays = [float(r.min_delay) for r in rows]; gaps = [float(r.min_gap) for r in rows]
    n = len(delays)
    if n < 3: return CorrelationAnalysis(pearson_correlation=0.0, interpretation="Datos insuficientes")
    md, mg = sum(delays) / n, sum(gaps) / n
    num = sum((d - md) * (g - mg) for d, g in zip(delays, gaps))
    den = (sum((d - md) ** 2 for d in delays) ** 0.5) * (sum((g - mg) ** 2 for g in gaps) ** 0.5)
    r_val = max(-1.0, min(1.0, num / den)) if den else 0.0
    interp = "No hay correlación lineal significativa" if abs(r_val) < 0.1 else "Correlación débil" if abs(r_val) < 0.4 else "Correlación moderada" if abs(r_val) < 0.7 else "Correlación fuerte"
    return CorrelationAnalysis(pearson_correlation=round(r_val, 4), interpretation=f"{interp} (r={round(r_val, 4)}) entre min_delay y min_gap")



@router.get(
    "/locations-with-coords",
    response_model=list[LocationWithCoords],
    summary="Ubicaciones con coordenadas geográficas",
    description="Top ubicaciones con sus coordenadas (lat/lng) obtenidas mediante Nominatim/OSM. Incluye total de retrasos y promedio de minutos para mapear hotspots.",
)
async def get_locations_with_coords(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    geocode: bool = Query(False, description="Si es True, geocodifica ubicaciones sin coordenadas usando Nominatim"),
):
    query = (
        select(
            Location.id, Location.name,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
            LocationCoordinate.latitude,
            LocationCoordinate.longitude,
        )
        .join(Location, DelayRecord.location_id == Location.id)
        .outerjoin(LocationCoordinate, LocationCoordinate.location_id == Location.id)
        .group_by(Location.id, Location.name, LocationCoordinate.latitude, LocationCoordinate.longitude)
        .order_by(desc("total_delays"))
        .limit(limit)
    )
    rows = (await db.execute(query)).all()

    result = []
    need_geocode = []
    for r in rows:
        lat = float(r.latitude) if r.latitude else None
        lng = float(r.longitude) if r.longitude else None
        if geocode and lat is None and lng is None:
            need_geocode.append(r)
        result.append(LocationWithCoords(id=r.id, name=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2), latitude=lat, longitude=lng))

    if need_geocode and geocode:
        geocoded = await _geocode_locations([(r.id, r.name) for r in need_geocode])
        for item in result:
            if item.id in geocoded:
                item.latitude, item.longitude = geocoded[item.id]

    return result




@router.get(
    "/route-network",
    response_model=dict,
    summary="Red de rutas con ubicaciones",
    description="Para cada ruta, muestra las ubicaciones por las que pasa con coordenadas, total de retrasos y promedio de minutos. Ideal para visualizar la red de tranvías en un mapa.",
)
async def get_route_network(
    db: AsyncSession = Depends(get_db),
    top_routes: int = Query(10, ge=1, le=50, description="Cantidad de rutas a incluir"),
    top_locations_per_route: int = Query(10, ge=1, le=30, description="Ubicaciones por ruta"),
):
    top_route_codes = (await db.execute(
        select(Route.code, func.count(DelayRecord.id).label("total_delays"))
        .join(Route, DelayRecord.route_id == Route.id).group_by(Route.code).order_by(desc("total_delays")).limit(top_routes)
    )).all()

    network = {}
    for rc, _ in top_route_codes:
        locs = (await db.execute(
            select(
                Location.id, Location.name,
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
                LocationCoordinate.latitude,
                LocationCoordinate.longitude,
            )
            .join(Location, DelayRecord.location_id == Location.id)
            .outerjoin(LocationCoordinate, LocationCoordinate.location_id == Location.id)
            .where(DelayRecord.route_id == select(Route.id).where(Route.code == rc).scalar_subquery())
            .group_by(Location.id, Location.name, LocationCoordinate.latitude, LocationCoordinate.longitude)
            .order_by(desc("total_delays")).limit(top_locations_per_route)
        )).all()

        network[rc] = {
            "locations": [
                RouteNetworkNode(
                    location_id=r.id, location_name=r.name,
                    latitude=float(r.latitude) if r.latitude else None,
                    longitude=float(r.longitude) if r.longitude else None,
                    total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2),
                ) for r in locs
            ],
            "total_delays": sum(r.total_delays for r in locs),
        }

    return network




@router.post(
    "/geocode",
    summary="Geocodificar ubicaciones",
    description="Toma ubicaciones sin coordenadas y las geocodifica usando Nominatim (OpenStreetMap). Guarda resultados en la tabla location_coordinates. Rate-limited a 1 req/s.",
)
async def geocode_locations_endpoint(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200, description="Máximo de ubicaciones a geocodificar en esta llamada"),
):
    uncached = (await db.execute(
        select(Location.id, Location.name)
        .outerjoin(LocationCoordinate, LocationCoordinate.location_id == Location.id)
        .where(LocationCoordinate.id.is_(None))
        .order_by(Location.id)
        .limit(limit)
    )).all()

    if not uncached:
        return {"message": "No hay ubicaciones pendientes de geocodificar", "geocoded": 0}

    geocoded = await _geocode_locations([(r.id, r.name) for r in uncached])

    for loc_id, (lat, lng, address) in geocoded.items():
        coord = LocationCoordinate(location_id=loc_id, latitude=lat, longitude=lng, full_address=address, source="nominatim")
        db.add(coord)
    await db.commit()

    return {"message": f"Geocodificadas {len(geocoded)} ubicaciones", "geocoded": len(geocoded), "results": [{"location_id": lid, "latitude": v[0], "longitude": v[1], "address": v[2]} for lid, v in geocoded.items()]}


async def _geocode_locations(locations: list[tuple[int, str]]) -> dict[int, tuple[float, float, str]]:
    results = {}
    async with httpx.AsyncClient(timeout=10) as client:
        for loc_id, name in locations:
            clean_name = name.replace(" AND ", " & ").replace("  ", " ").strip()
            query = f"{clean_name}, Toronto, Ontario, Canada"
            try:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": query, "format": "json", "limit": 1},
                    headers={"User-Agent": "TTCStreetcarAnalytics/1.0"},
                )
                data = resp.json()
                if data:
                    results[loc_id] = (float(data[0]["lat"]), float(data[0]["lon"]), data[0].get("display_name", ""))
            except Exception:
                pass
            await asyncio.sleep(1)
    return results
