from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db
from src.db.models import DelayRecord, Route, Location, IncidentType, Vehicle
from src.routes.schemas.schemas_analytics import (
    DelaysByRoute, DelaysByType, DelaysByMonth,
    DelaysByDay, WorstLocation, Summary,
    DeepAnalysis, DirectionAnalysis, YearOverYear,
    PeakHour, IncidentSeverity,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/delays-by-route", response_model=list[DelaysByRoute])
async def get_delays_by_route(db: AsyncSession = Depends(get_db)):
    query = (
        select(
            Route.code,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
            func.max(DelayRecord.min_delay).label("max_delay"),
        )
        .join(Route, DelayRecord.route_id == Route.id)
        .group_by(Route.code)
        .order_by(desc("total_delays"))
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        DelaysByRoute(route=r.code, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2), max_delay_min=int(r.max_delay or 0))
        for r in rows
    ]


@router.get("/delays-by-type", response_model=list[DelaysByType])
async def get_delays_by_type(db: AsyncSession = Depends(get_db)):
    query = (
        select(
            IncidentType.name,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
        .group_by(IncidentType.name)
        .order_by(desc("total_delays"))
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        DelaysByType(incident_type=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]


@router.get("/delays-by-month", response_model=list[DelaysByMonth])
async def get_delays_by_month(db: AsyncSession = Depends(get_db)):
    query = (
        select(
            func.extract("year", DelayRecord.report_date).label("year"),
            func.extract("month", DelayRecord.report_date).label("month"),
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .group_by("year", "month")
        .order_by("year", "month")
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        DelaysByMonth(year=int(r.year), month=int(r.month), total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]


@router.get("/delays-by-day", response_model=list[DelaysByDay])
async def get_delays_by_day(db: AsyncSession = Depends(get_db)):
    query = (
        select(
            DelayRecord.day,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .group_by(DelayRecord.day)
        .order_by(desc("total_delays"))
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        DelaysByDay(day=r.day, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]


@router.get("/worst-locations", response_model=list[WorstLocation])
async def get_worst_locations(db: AsyncSession = Depends(get_db)):
    query = (
        select(
            Location.name,
            func.count(DelayRecord.id).label("total_delays"),
            func.avg(DelayRecord.min_delay).label("avg_delay"),
        )
        .join(Location, DelayRecord.location_id == Location.id)
        .group_by(Location.name)
        .order_by(desc("total_delays"))
        .limit(20)
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        WorstLocation(location=r.name, total_delays=r.total_delays, avg_delay_min=round(float(r.avg_delay or 0), 2))
        for r in rows
    ]


@router.get("/summary", response_model=Summary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    total_records = (await db.execute(select(func.count(DelayRecord.id)))).scalar()
    total_routes = (await db.execute(select(func.count(Route.id)))).scalar()
    total_locations = (await db.execute(select(func.count(Location.id)))).scalar()
    total_incident_types = (await db.execute(select(func.count(IncidentType.id)))).scalar()
    total_vehicles = (await db.execute(select(func.count(Vehicle.id)))).scalar()
    avg_delay = (await db.execute(select(func.avg(DelayRecord.min_delay)))).scalar()

    busiest_route = (
        await db.execute(
            select(Route.code)
            .join(DelayRecord, DelayRecord.route_id == Route.id)
            .group_by(Route.code)
            .order_by(desc(func.count(DelayRecord.id)))
            .limit(1)
        )
    ).scalar()

    most_common_incident = (
        await db.execute(
            select(IncidentType.name)
            .join(DelayRecord, DelayRecord.incident_type_id == IncidentType.id)
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
        busiest_route=busiest_route,
        most_common_incident=most_common_incident,
    )


@router.get("/deep-analysis", response_model=DeepAnalysis)
async def get_deep_analysis(db: AsyncSession = Depends(get_db)):
    route_with_highest_avg = (
        await db.execute(
            select(
                Route.code,
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
                func.max(DelayRecord.min_delay).label("max_delay"),
            )
            .join(Route, DelayRecord.route_id == Route.id)
            .group_by(Route.code)
            .order_by(desc("avg_delay"))
            .limit(1)
        )
    ).first()

    worst_day = (
        await db.execute(
            select(DelayRecord.day)
            .group_by(DelayRecord.day)
            .order_by(desc(func.count(DelayRecord.id)))
            .limit(1)
        )
    ).scalar()

    month_with_most = (
        await db.execute(
            select(
                func.extract("year", DelayRecord.report_date).label("year"),
                func.extract("month", DelayRecord.report_date).label("month"),
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
            )
            .group_by("year", "month")
            .order_by(desc("total_delays"))
            .limit(1)
        )
    ).first()

    total_minutes = (
        await db.execute(select(func.coalesce(func.sum(DelayRecord.min_delay), 0)))
    ).scalar()

    direction_rows = (
        await db.execute(
            select(
                DelayRecord.direction,
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
            )
            .group_by(DelayRecord.direction)
            .order_by(desc("total_delays"))
        )
    ).all()

    yoy_rows = (
        await db.execute(
            select(
                func.extract("year", DelayRecord.report_date).label("year"),
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
            )
            .group_by("year")
            .order_by("year")
        )
    ).all()

    peak_rows = (
        await db.execute(
            select(
                func.extract("hour", DelayRecord.time).label("hour"),
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
            )
            .where(DelayRecord.time.isnot(None))
            .group_by("hour")
            .order_by(desc("total_delays"))
        )
    ).all()

    severity_rows = (
        await db.execute(
            select(
                IncidentType.name,
                func.count(DelayRecord.id).label("total_delays"),
                func.avg(DelayRecord.min_delay).label("avg_delay"),
            )
            .join(IncidentType, DelayRecord.incident_type_id == IncidentType.id)
            .group_by(IncidentType.name)
            .order_by(desc("avg_delay"))
        )
    ).all()

    def fmt_hour(h: int) -> str:
        return f"{h:02d}:00"

    return DeepAnalysis(
        route_with_highest_avg_delay=DelaysByRoute(
            route=route_with_highest_avg.code,
            total_delays=route_with_highest_avg.total_delays,
            avg_delay_min=round(float(route_with_highest_avg.avg_delay or 0), 2),
            max_delay_min=int(route_with_highest_avg.max_delay or 0),
        ) if route_with_highest_avg else None,
        worst_day_for_delays=worst_day,
        month_with_most_delays=DelaysByMonth(
            year=int(month_with_most.year),
            month=int(month_with_most.month),
            total_delays=month_with_most.total_delays,
            avg_delay_min=round(float(month_with_most.avg_delay or 0), 2),
        ) if month_with_most else None,
        total_delay_hours=round(float(total_minutes or 0) / 60, 2),
        avg_delay_by_direction=[
            DirectionAnalysis(
                direction=r.direction,
                total_delays=r.total_delays,
                avg_delay_min=round(float(r.avg_delay or 0), 2),
            )
            for r in direction_rows if r.direction
        ],
        year_over_year_trend=[
            YearOverYear(
                year=int(r.year),
                total_delays=r.total_delays,
                avg_delay_min=round(float(r.avg_delay or 0), 2),
            )
            for r in yoy_rows
        ],
        peak_hour_analysis=[
            PeakHour(
                hour=fmt_hour(int(r.hour)),
                total_delays=r.total_delays,
                avg_delay_min=round(float(r.avg_delay or 0), 2),
            )
            for r in peak_rows
        ],
        incident_type_severity=[
            IncidentSeverity(
                incident_type=r.name,
                total_delays=r.total_delays,
                avg_delay_min=round(float(r.avg_delay or 0), 2),
            )
            for r in severity_rows
        ],
    )
