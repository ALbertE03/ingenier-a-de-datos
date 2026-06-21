import glob
import os

import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Route, Location, IncidentType, Vehicle, DelayRecord

INITIAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "initial_data")


def _normalize_direction(direction: str) -> str | None:
    if not direction or pd.isna(direction):
        return None
    d = direction.strip().upper()
    if d in ("EB", "E/B", "EAST BOUND", "EAST"):
        return "EB"
    if d in ("WB", "W/B", "WEST BOUND", "WEST"):
        return "WB"
    if d in ("NB", "N/B", "NORTH BOUND", "NORTH"):
        return "NB"
    if d in ("SB", "S/B", "SOUTH BOUND", "SOUTH"):
        return "SB"
    return d


def _get_season(month: int) -> str:
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Spring"
    if month in (6, 7, 8):
        return "Summer"
    return "Fall"


def _get_time_slot(hour: int) -> str:
    if hour < 6:
        return "Early Morning"
    if hour < 10:
        return "Morning Peak"
    if hour < 15:
        return "Midday"
    if hour < 19:
        return "Afternoon Peak"
    return "Evening"


def _get_delay_severity(min_delay: int) -> str:
    if min_delay < 5:
        return "Minor"
    if min_delay < 15:
        return "Moderate"
    if min_delay < 30:
        return "Significant"
    return "Severe"


def _parse_time(t):
    if pd.isna(t):
        return None, None
    try:
        parsed = pd.to_datetime(str(t).strip(), format="%I:%M:%S %p")
        return parsed.time(), parsed.hour
    except (ValueError, TypeError):
        try:
            parsed = pd.to_datetime(str(t).strip(), format="%H:%M:%S")
            return parsed.time(), parsed.hour
        except (ValueError, TypeError):
            return None, None


async def load_all_data(db: AsyncSession):
    csv_files = sorted(glob.glob(os.path.join(INITIAL_DATA_DIR, "*.csv")))
    if not csv_files:
        print("No CSV files found in", INITIAL_DATA_DIR)
        return

    print(f"Found {len(csv_files)} CSV files. Loading data...")

    dfs = []
    for f in csv_files:
        df = pd.read_csv(f)
        dfs.append(df)

    all_data = pd.concat(dfs, ignore_index=True)
    total = len(all_data)
    print(f"Total records: {total}")

    existing_count = await db.execute(select(func.count(DelayRecord.id)))
    if existing_count.scalar() and existing_count.scalar() > 0:
        print(f"Database already has {existing_count.scalar()} delay records. Skipping.")
        return

    #  Populate lookup tables 
    route_codes = set()
    for val in all_data["Route"].dropna().unique():
        if isinstance(val, (int, float)):
            route_codes.add(str(int(val)))
        else:
            cleaned = str(val).strip()
            try:
                route_codes.add(str(int(float(cleaned))))
            except (ValueError, TypeError):
                route_codes.add(cleaned)
    for code in sorted(route_codes):
        r = await db.execute(select(Route).filter(Route.code == code))
        if not r.scalars().first():
            db.add(Route(code=code))
    await db.commit()

    location_names = set(str(v).strip() for v in all_data["Location"].dropna().unique())
    for name in sorted(location_names):
        r = await db.execute(select(Location).filter(Location.name == name))
        if not r.scalars().first():
            db.add(Location(name=name))
    await db.commit()

    incident_names = set(str(v).strip() for v in all_data["Incident"].dropna().unique())
    for name in sorted(incident_names):
        r = await db.execute(select(IncidentType).filter(IncidentType.name == name))
        if not r.scalars().first():
            db.add(IncidentType(name=name))
    await db.commit()

    vehicle_nums = set()
    for v in all_data["Vehicle"].dropna().unique():
        try:
            vehicle_nums.add(int(v))
        except (ValueError, TypeError):
            pass
    for v in sorted(vehicle_nums):
        r = await db.execute(select(Vehicle).filter(Vehicle.vehicle_number == v))
        if not r.scalars().first():
            db.add(Vehicle(vehicle_number=v))
    await db.commit()

    #  Build lookup maps 
    route_map = {r.code: r.id for r in (await db.execute(select(Route))).scalars().all()}
    location_map = {l.name: l.id for l in (await db.execute(select(Location))).scalars().all()}
    incident_map = {i.name: i.id for i in (await db.execute(select(IncidentType))).scalars().all()}
    vehicle_map = {v.vehicle_number: v.id for v in (await db.execute(select(Vehicle))).scalars().all()}

    print(f"Routes: {len(route_map)}, Locations: {len(location_map)}, "
          f"Incident types: {len(incident_map)}, Vehicles: {len(vehicle_map)}")

    # Prepare enrichment columns 
    all_data["report_date"] = pd.to_datetime(all_data["Report.Date"]).dt.date
    all_data["parsed_date"] = pd.to_datetime(all_data["Report.Date"])
    all_data["year"] = all_data["parsed_date"].dt.year.astype(int)
    all_data["month"] = all_data["parsed_date"].dt.month.astype(int)
    all_data["quarter"] = all_data["parsed_date"].dt.quarter.astype(int)
    all_data["week"] = all_data["parsed_date"].dt.isocalendar().week.astype(int)

    all_data["min_delay"] = pd.to_numeric(all_data["Min.Delay"], errors="coerce").fillna(0).astype(int)
    all_data["min_gap"] = pd.to_numeric(all_data["Min.Gap"], errors="coerce").fillna(0).astype(int)
    all_data["delay_hours"] = (all_data["min_delay"] / 60.0).round(2)
    all_data["delay_severity"] = all_data["min_delay"].apply(_get_delay_severity)
    all_data["is_weekend"] = all_data["Day"].apply(
        lambda d: d in ("Saturday", "Sunday") if pd.notna(d) else None
    )
    all_data["season"] = all_data["month"].apply(_get_season)

    dir_data = all_data["Direction"].apply(_normalize_direction)
    all_data["normalized_direction"] = dir_data

    time_data = all_data["Time"].apply(_parse_time)
    all_data["parsed_time"] = [t[0] for t in time_data]
    all_data["hour"] = [t[1] for t in time_data]
    all_data["time_slot"] = all_data["hour"].apply(
        lambda h: _get_time_slot(int(h)) if pd.notna(h) else None
    )

    def _clean_route(x):
        if pd.notna(x):
            if isinstance(x, (int, float)):
                return str(int(x))
            cleaned = str(x).strip()
            try:
                return str(int(float(cleaned)))
            except (ValueError, TypeError):
                return cleaned
        return None

    all_data["route_code"] = all_data["Route"].apply(_clean_route)
    all_data["location_name"] = all_data["Location"].apply(
        lambda x: str(x).strip() if pd.notna(x) else None
    )
    all_data["incident_name"] = all_data["Incident"].apply(
        lambda x: str(x).strip() if pd.notna(x) else None
    )
    all_data["vehicle_num"] = pd.to_numeric(all_data["Vehicle"], errors="coerce").fillna(0).astype(int)

    # Insert delay records in batches 
    def n(val):
        return None if pd.isna(val) else val

    BATCH_SIZE = 5000
    records = []

    for idx in range(total):
        row = all_data.iloc[idx]
        records.append(DelayRecord(
            report_date=row["report_date"],
            time=n(row["parsed_time"]),
            day=n(str(row["Day"]).strip()) if pd.notna(row["Day"]) else None,
            min_delay=int(row["min_delay"]),
            min_gap=int(row["min_gap"]),
            direction=n(str(row["Direction"]).strip()) if pd.notna(row["Direction"]) else None,
            route_id=n(route_map.get(row["route_code"])),
            location_id=n(location_map.get(row["location_name"])),
            incident_type_id=n(incident_map.get(row["incident_name"])),
            vehicle_id=n(vehicle_map.get(row["vehicle_num"])),
            delay_hours=n(row["delay_hours"]),
            delay_severity=n(row["delay_severity"]),
            time_slot=n(row["time_slot"]),
            season=n(row["season"]),
            is_weekend=n(row["is_weekend"]),
            normalized_direction=n(row["normalized_direction"]),
            year=int(row["year"]),
            month=int(row["month"]),
            week=int(row["week"]),
            quarter=int(row["quarter"]),
        ))

        if len(records) >= BATCH_SIZE:
            db.add_all(records)
            await db.commit()
            print(f"Inserted {idx + 1}/{total} records...")
            records = []

    if records:
        db.add_all(records)
        await db.commit()

    final_count = await db.execute(select(func.count(DelayRecord.id)))
    print(f"Data loading complete! Total delay records: {final_count.scalar()}")
