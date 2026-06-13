import glob
import os

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Route, Location, IncidentType, Vehicle, DelayRecord

INITIAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "initial_data")


async def load_all_data(db: AsyncSession):
    result = await db.execute(select(DelayRecord).limit(1))
    if result.scalars().first() is not None:
        print("Data already loaded, skipping seed.")
        return

    csv_files = sorted(glob.glob(os.path.join(INITIAL_DATA_DIR, "*.csv")))
    print(f"Found {len(csv_files)} CSV files to load.")

    routes_cache = {r.code: r.id for r in (await db.execute(select(Route))).scalars().all()}
    locations_cache = {r.name: r.id for r in (await db.execute(select(Location))).scalars().all()}
    incidents_cache = {r.name: r.id for r in (await db.execute(select(IncidentType))).scalars().all()}
    vehicles_cache = {r.vehicle_number: r.id for r in (await db.execute(select(Vehicle))).scalars().all()}

    for filepath in csv_files:
        print(f"Loading {os.path.basename(filepath)}...")
        df = pd.read_csv(filepath, dtype={"Route": str, "Vehicle": str})

        new_routes = {}
        new_locations = {}
        new_incidents = {}
        new_vehicles = {}

        for _, row in df.iterrows():
            code = str(row["Route"]).strip() if pd.notna(row["Route"]) else ""
            if code and code not in routes_cache and code not in new_routes:
                r = Route(code=code)
                db.add(r)
                await db.flush()
                routes_cache[code] = r.id
                new_routes[code] = r.id

            loc = str(row["Location"]).strip() if pd.notna(row["Location"]) else "Unknown"
            if loc not in locations_cache and loc not in new_locations:
                l = Location(name=loc)
                db.add(l)
                await db.flush()
                locations_cache[loc] = l.id
                new_locations[loc] = l.id

            inc = str(row["Incident"]).strip() if pd.notna(row["Incident"]) else "Unknown"
            if inc not in incidents_cache and inc not in new_incidents:
                i = IncidentType(name=inc)
                db.add(i)
                await db.flush()
                incidents_cache[inc] = i.id
                new_incidents[inc] = i.id

            v = row["Vehicle"]
            vnum = None
            try:
                if pd.notna(v):
                    vnum = int(float(str(v).strip()))
            except (ValueError, TypeError):
                pass
            if vnum is not None and vnum not in vehicles_cache and vnum not in new_vehicles:
                v_obj = Vehicle(vehicle_number=vnum)
                db.add(v_obj)
                await db.flush()
                vehicles_cache[vnum] = v_obj.id
                new_vehicles[vnum] = v_obj.id

        records = []
        for _, row in df.iterrows():
            code = str(row["Route"]).strip() if pd.notna(row["Route"]) else ""
            loc = str(row["Location"]).strip() if pd.notna(row["Location"]) else "Unknown"
            inc = str(row["Incident"]).strip() if pd.notna(row["Incident"]) else "Unknown"
            vnum = None
            try:
                if pd.notna(row["Vehicle"]):
                    vnum = int(float(str(row["Vehicle"]).strip()))
            except (ValueError, TypeError):
                pass

            report_date = None
            try:
                report_date = pd.to_datetime(str(row["Report.Date"]).strip()).date()
            except (ValueError, KeyError):
                pass

            time_val = None
            try:
                time_val = pd.to_datetime(str(row["Time"]).strip(), format="%H:%M").time()
            except (ValueError, KeyError):
                pass

            records.append(DelayRecord(
                report_date=report_date,
                time=time_val,
                day=str(row["Day"]).strip() if pd.notna(row["Day"]) else None,
                min_delay=int(row["Min.Delay"]) if pd.notna(row["Min.Delay"]) else None,
                min_gap=int(row["Min.Gap"]) if pd.notna(row["Min.Gap"]) else None,
                direction=str(row["Direction"]).strip() if pd.notna(row["Direction"]) else None,
                route_id=routes_cache.get(code) if code else None,
                location_id=locations_cache[loc],
                incident_type_id=incidents_cache[inc],
                vehicle_id=vehicles_cache.get(vnum) if vnum is not None else None,
            ))

        db.add_all(records)
        await db.commit()
        print(f"  Inserted {len(records)} records from {os.path.basename(filepath)}")

    print("All data loaded successfully.")
