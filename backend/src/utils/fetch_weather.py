import asyncio
from datetime import date

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import SessionLocal
from src.db.models import WeatherRecord, DelayRecord

WMO_CODES = {
    0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    56: "Light Freezing Drizzle", 57: "Dense Freezing Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    66: "Light Freezing Rain", 67: "Heavy Freezing Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
    85: "Slight Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Slight Hail", 99: "Thunderstorm with Heavy Hail",
}


async def fetch_weather_for_dates(dates: list[date], db: AsyncSession):
    if not dates:
        return

    dates_sorted = sorted(dates)
    start = dates_sorted[0].isoformat()
    end = dates_sorted[-1].isoformat()

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": 43.7,
        "longitude": -79.42,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,weather_code",
        "start_date": start,
        "end_date": end,
        "timezone": "America/Toronto",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    daily = data["daily"]
    existing_date = set()
    result = await db.execute(select(WeatherRecord.date))
    for row in result:
        existing_date.add(row[0])

    for i in range(len(daily["time"])):
        d = date.fromisoformat(daily["time"][i])
        if d in existing_date:
            continue

        wc = daily["weather_code"][i]
        record = WeatherRecord(
            date=d,
            temp_max=daily["temperature_2m_max"][i],
            temp_min=daily["temperature_2m_min"][i],
            precipitation=daily["precipitation_sum"][i],
            snowfall=daily["snowfall_sum"][i],
            weather_code=wc,
            weather_desc=WMO_CODES.get(wc, "Unknown"),
        )
        db.add(record)

    await db.commit()


async def main():
    print("Fetching weather data from Open-Meteo...")
    async with SessionLocal() as db:
        result = await db.execute(
            select(DelayRecord.report_date).distinct().order_by(DelayRecord.report_date)
        )
        dates = [row[0] for row in result if row[0] is not None]
        print(f"Found {len(dates)} unique dates to fetch weather for...")
        await fetch_weather_for_dates(dates, db)

        total = await db.execute(select(func.count(WeatherRecord.id)))
        print(f"Weather data stored: {total.scalar()} records")
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
