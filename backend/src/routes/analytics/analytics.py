from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from src.db.session import get_db
from src.db import models

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def summary(db: AsyncSession = Depends(get_db)):
    total_records = await db.execute(select(func.count(models.DelayRecord.id)))
    total_routes = await db.execute(select(func.count(models.Route.id)))
    total_locations = await db.execute(select(func.count(models.Location.id)))
    total_incident_types = await db.execute(select(func.count(models.IncidentType.id)))
    total_vehicles = await db.execute(select(func.count(models.Vehicle.id)))
    avg_delay = await db.execute(select(func.avg(models.DelayRecord.min_delay)))
    avg_gap = await db.execute(select(func.avg(models.DelayRecord.min_gap)))
    max_delay = await db.execute(select(func.max(models.DelayRecord.min_delay)))

    busiest = await db.execute(
        select(models.Route.code, func.count(models.DelayRecord.id).label("cnt"))
        .join(models.DelayRecord, models.Route.id == models.DelayRecord.route_id)
        .group_by(models.Route.code)
        .order_by(desc("cnt"))
        .limit(1)
    )
    busiest_row = busiest.first()

    common_incident = await db.execute(
        select(models.IncidentType.name, func.count(models.DelayRecord.id).label("cnt"))
        .join(models.DelayRecord, models.IncidentType.id == models.DelayRecord.incident_type_id)
        .group_by(models.IncidentType.name)
        .order_by(desc("cnt"))
        .limit(1)
    )
    common_row = common_incident.first()

    return {
        "total_records": total_records.scalar(),
        "total_routes": total_routes.scalar(),
        "total_locations": total_locations.scalar(),
        "total_incident_types": total_incident_types.scalar(),
        "total_vehicles": total_vehicles.scalar(),
        "overall_avg_delay": round(avg_delay.scalar() or 0, 2),
        "overall_avg_gap": round(avg_gap.scalar() or 0, 2),
        "max_delay": max_delay.scalar() or 0,
        "busiest_route": busiest_row[0] if busiest_row else None,
        "most_common_incident": common_row[0] if common_row else None,
    }


@router.get("/delays-by-route")
async def delays_by_route(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            models.Route.code.label("route"),
            func.count(models.DelayRecord.id).label("total_delays"),
            func.avg(models.DelayRecord.min_delay).label("avg_delay_min"),
            func.max(models.DelayRecord.min_delay).label("max_delay_min"),
        )
        .join(models.DelayRecord, models.Route.id == models.DelayRecord.route_id)
        .group_by(models.Route.code)
        .order_by(desc("total_delays"))
    )
    return [
        {
            "route": r.route,
            "total_delays": r.total_delays,
            "avg_delay_min": round(r.avg_delay_min, 2) if r.avg_delay_min else 0,
            "max_delay_min": r.max_delay_min or 0,
        }
        for r in result
    ]


@router.get("/delays-by-type")
async def delays_by_type(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            models.IncidentType.name.label("incident_type"),
            func.count(models.DelayRecord.id).label("total_delays"),
            func.avg(models.DelayRecord.min_delay).label("avg_delay_min"),
        )
        .join(models.DelayRecord, models.IncidentType.id == models.DelayRecord.incident_type_id)
        .group_by(models.IncidentType.name)
        .order_by(desc("total_delays"))
    )
    return [
        {
            "incident_type": r.incident_type,
            "total_delays": r.total_delays,
            "avg_delay_min": round(r.avg_delay_min, 2) if r.avg_delay_min else 0,
        }
        for r in result
    ]


@router.get("/delays-by-month")
async def delays_by_month(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            models.DelayRecord.year,
            models.DelayRecord.month,
            func.count(models.DelayRecord.id).label("total_delays"),
            func.avg(models.DelayRecord.min_delay).label("avg_delay_min"),
        )
        .group_by(models.DelayRecord.year, models.DelayRecord.month)
        .order_by(models.DelayRecord.year, models.DelayRecord.month)
    )
    return [
        {
            "year": r.year,
            "month": r.month,
            "total_delays": r.total_delays,
            "avg_delay_min": round(r.avg_delay_min, 2) if r.avg_delay_min else 0,
        }
        for r in result
    ]


@router.get("/delays-by-day")
async def delays_by_day(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            models.DelayRecord.day,
            func.count(models.DelayRecord.id).label("total_delays"),
            func.avg(models.DelayRecord.min_delay).label("avg_delay_min"),
        )
        .group_by(models.DelayRecord.day)
        .order_by(desc("total_delays"))
    )
    return [
        {
            "day": r.day,
            "total_delays": r.total_delays,
            "avg_delay_min": round(r.avg_delay_min, 2) if r.avg_delay_min else 0,
        }
        for r in result
    ]


@router.get("/weather-impact")
async def weather_impact(db: AsyncSession = Depends(get_db)):
    avg_all = await db.execute(select(func.avg(models.DelayRecord.min_delay)))
    avg_all = round(avg_all.scalar() or 0, 2)

    snow_delay = await db.execute(
        select(func.avg(models.DelayRecord.min_delay))
        .join(models.WeatherRecord, models.DelayRecord.weather_id == models.WeatherRecord.id)
        .where(models.WeatherRecord.snowfall > 0)
    )
    rain_delay = await db.execute(
        select(func.avg(models.DelayRecord.min_delay))
        .join(models.WeatherRecord, models.DelayRecord.weather_id == models.WeatherRecord.id)
        .where(
            models.WeatherRecord.precipitation > 0,
            (models.WeatherRecord.snowfall.is_(None) | (models.WeatherRecord.snowfall == 0)),
        )
    )
    cold_delay = await db.execute(
        select(func.avg(models.DelayRecord.min_delay))
        .join(models.WeatherRecord, models.DelayRecord.weather_id == models.WeatherRecord.id)
        .where(models.WeatherRecord.temp_min < -5)
    )
    clear_delay = await db.execute(
        select(func.avg(models.DelayRecord.min_delay))
        .join(models.WeatherRecord, models.DelayRecord.weather_id == models.WeatherRecord.id)
        .where(models.WeatherRecord.weather_code == 0)
    )

    by_weather = await db.execute(
        select(
            models.WeatherRecord.weather_desc,
            func.count(models.DelayRecord.id).label("total_delays"),
            func.avg(models.DelayRecord.min_delay).label("avg_delay_min"),
        )
        .join(models.DelayRecord, models.DelayRecord.weather_id == models.WeatherRecord.id)
        .group_by(models.WeatherRecord.weather_desc)
        .order_by(desc("total_delays"))
    )

    return {
        "overall_avg_delay": avg_all,
        "snow_avg_delay": round(snow_delay.scalar() or 0, 2),
        "rain_avg_delay": round(rain_delay.scalar() or 0, 2),
        "cold_avg_delay": round(cold_delay.scalar() or 0, 2),
        "clear_avg_delay": round(clear_delay.scalar() or 0, 2),
        "by_weather": [
            {
                "weather_desc": r.weather_desc,
                "total_delays": r.total_delays,
                "avg_delay_min": round(r.avg_delay_min, 2) if r.avg_delay_min else 0,
            }
            for r in by_weather
        ],
    }


@router.get("/worst-locations")
async def worst_locations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            models.Location.name.label("location"),
            func.count(models.DelayRecord.id).label("total_delays"),
            func.avg(models.DelayRecord.min_delay).label("avg_delay_min"),
        )
        .join(models.DelayRecord, models.Location.id == models.DelayRecord.location_id)
        .group_by(models.Location.name)
        .order_by(desc("total_delays"))
        .limit(50)
    )
    return [
        {
            "location": r.location,
            "total_delays": r.total_delays,
            "avg_delay_min": round(r.avg_delay_min, 2) if r.avg_delay_min else 0,
        }
        for r in result
    ]
