import glob
import os
import re
from collections import Counter, defaultdict

import pandas as pd
from sqlalchemy import select, bindparam
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Route, Location, IncidentType, IncidentCategory, Vehicle, DelayRecord

INITIAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "initial_data")

STOP_WORDS = {
    "the", "a", "an", "of", "and", "in", "to", "for", "by", "with",
    "on", "at", "is", "not", "no", "or", "as", "are", "be", "was",
    "from", "due", "related", "includes", "other",
}


def char_ngrams(name: str, n: int = 4) -> set[str]:
    normalized = re.sub(r'[^a-z0-9]', '', name.lower())
    return {normalized[i:i+n] for i in range(len(normalized)-n+1)}


def cosine_sim(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / ((len(a) ** 0.5) * (len(b) ** 0.5))


def discover_clusters(names: list[str], threshold: float = 0.35) -> list[tuple[str, list[str]]]:
    names = sorted(names)
    ngram_sets = {name: char_ngrams(name) for name in names}
    adj = defaultdict(set)
    for i, n1 in enumerate(names):
        for j, n2 in enumerate(names):
            if i >= j:
                continue
            sim = cosine_sim(ngram_sets[n1], ngram_sets[n2])
            if sim >= threshold:
                adj[n1].add(n2)
                adj[n2].add(n1)

    visited = set()
    clusters = []
    for name in names:
        if name in visited:
            continue
        stack = [name]
        cluster = []
        while stack:
            cur = stack.pop()
            if cur in visited:
                continue
            visited.add(cur)
            cluster.append(cur)
            stack.extend(adj[cur] - visited)
        if cluster:
            clusters.append(cluster)

    for n in names:
        if n not in visited:
            clusters.append([n])

    result = []
    for cl in clusters:
        all_words = Counter()
        for n in cl:
            words = re.findall(r'[A-Za-z]+', n.lower())
            all_words.update(w for w in words if w not in STOP_WORDS and len(w) > 2)
        top = [w.upper() for w, _ in all_words.most_common(3) if all_words[w] >= max(1, int(len(cl) * 0.4))]
        if not top and all_words:
            top = [all_words.most_common(1)[0][0].upper()]
        cat_name = " / ".join(top) if top else cl[0][:30]
        result.append((cat_name, cl))

    return result


def normalize_direction(raw) -> str | None:
    if pd.isna(raw):
        return None
    s = str(raw).strip().upper()
    s = re.sub(r'\s+', '', s)
    found = []
    if 'E' in s:
        found.append('E')
    if 'W' in s:
        found.append('W')
    if 'N' in s:
        found.append('N')
    if 'S' in s:
        found.append('S')
    if len(found) > 1:
        return 'B'
    if len(found) == 1:
        return found[0]
    return None


def get_time_slot(hour):
    if hour is None:
        return None
    if hour < 6:
        return "Late Night"
    if hour < 10:
        return "Morning Peak"
    if hour < 12:
        return "Late Morning"
    if hour < 14:
        return "Midday"
    if hour < 16:
        return "Afternoon Peak"
    if hour < 19:
        return "Evening"
    if hour < 22:
        return "Night"
    return "Late Night"


def get_season(month):
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Spring"
    if month in (6, 7, 8):
        return "Summer"
    return "Fall"


def get_severity(min_delay):
    if min_delay is None:
        return None
    if min_delay <= 5:
        return "Minor"
    if min_delay <= 15:
        return "Moderate"
    if min_delay <= 30:
        return "Significant"
    if min_delay <= 60:
        return "Severe"
    return "Critical"


def parse_time(time_str):
    if pd.isna(time_str):
        return None
    s = str(time_str).strip()
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M:%S %p", "%I:%M %p"):
        try:
            return pd.to_datetime(s, format=fmt).time()
        except (ValueError, TypeError):
            continue
    return None


def collect_incident_names(csv_files: list[str]) -> Counter:
    all_incidents = Counter()
    for filepath in csv_files:
        df = pd.read_csv(filepath, dtype={"Route": str, "Vehicle": str})
        all_incidents.update(df["Incident"].dropna().astype(str).str.strip())
    return all_incidents


async def load_all_data(db: AsyncSession):
    has_data = (await db.execute(select(DelayRecord).limit(1))).scalars().first() is not None
    csv_files = sorted(glob.glob(os.path.join(INITIAL_DATA_DIR, "*.csv")))
    print(f"Found {len(csv_files)} CSV files.")

    existing_cats = (await db.execute(
        select(IncidentCategory).options(selectinload(IncidentCategory.incident_types))
    )).scalars().all()
    categories = {cat.name: cat.id for cat in existing_cats}

    if categories:
        name_to_cat: dict[str, int] = {}
        for cat in existing_cats:
            for inc in cat.incident_types:
                name_to_cat[inc.name] = cat.id
        untyped = (await db.execute(
            select(IncidentType).where(IncidentType.category_id.is_(None))
        )).scalars().all()
        for inc in untyped:
            cid = name_to_cat.get(inc.name)
            if cid:
                inc.category_id = cid
                db.add(inc)
        if untyped:
            await db.commit()
            print(f"Assigned categories to {len(untyped)} existing incident types.")
    else:
        # ── Discover categories from data ──
        incident_counts = collect_incident_names(csv_files)
        all_names = list(incident_counts.keys())
        print(f"Discovered {len(all_names)} unique incident types from CSVs.")
        clusters = discover_clusters(all_names)
        print(f"Auto-discovered {len(clusters)} incident clusters:")
        for cat_name, members in sorted(clusters, key=lambda x: -sum(incident_counts[n] for n in x[1])):
            total = sum(incident_counts[n] for n in members)
            print(f"  {cat_name}: {len(members)} types, {total} total occurrences")

        # ── Create categories ──
        for cat_name, members in clusters:
            desc = f"Auto-discovered cluster: {', '.join(members[:5])}"
            if len(members) > 5:
                desc += f" and {len(members) - 5} more"
            cat = IncidentCategory(name=cat_name, description=desc)
            db.add(cat)
            await db.flush()
            categories[cat_name] = cat.id
        print(f"Created {len(categories)} incident categories from data.")

        # ── Assign categories to incident types ──
        name_to_cat: dict[str, int] = {}
        for cat_name, members in clusters:
            cat_id = categories[cat_name]
            for m in members:
                name_to_cat[m] = cat_id

        untyped = (await db.execute(
            select(IncidentType).where(IncidentType.category_id.is_(None))
        )).scalars().all()
        for inc in untyped:
            cid = name_to_cat.get(inc.name)
            if cid:
                inc.category_id = cid
                db.add(inc)
        if untyped:
            await db.commit()
            print(f"Assigned categories to {len(untyped)} existing incident types.")

    if has_data:
        ids_result = await db.execute(
            select(DelayRecord.id).where(DelayRecord.delay_hours.is_(None)).order_by(DelayRecord.id)
        )
        null_ids = ids_result.scalars().all()
        if null_ids:
            print(f"Backfilling {len(null_ids)} enrichment fields...")
            BATCH = 10000
            for i in range(0, len(null_ids), BATCH):
                batch_ids = null_ids[i:i + BATCH]
                records = (
                    await db.execute(
                        select(DelayRecord)
                        .where(DelayRecord.id.in_(batch_ids))
                        .order_by(DelayRecord.id)
                    )
                ).scalars().all()
                for rec in records:
                    hour = rec.time.hour if rec.time else None
                    month = rec.report_date.month if rec.report_date else None
                    rec.delay_hours = round((rec.min_delay or 0) / 60, 4)
                    rec.delay_severity = get_severity(rec.min_delay)
                    rec.time_slot = get_time_slot(hour)
                    rec.season = get_season(month)
                    rec.is_weekend = rec.day in ("Saturday", "Sunday") if rec.day else None
                    rec.normalized_direction = normalize_direction(rec.direction)
                    rec.year = rec.report_date.year if rec.report_date else None
                    rec.month = month
                    rec.week = rec.report_date.isocalendar()[1] if rec.report_date else None
                    rec.quarter = (month - 1) // 3 + 1 if month else None
                await db.flush()
                print(f"  Backfilled {min(i + BATCH, len(null_ids))} / {len(null_ids)} records...")
            await db.commit()
            print("Backfill complete.")
        print("Data already loaded, skipping seed.")
        return

    # ── Load all data ──
    routes_cache = {r.code: r.id for r in (await db.execute(select(Route))).scalars().all()}
    locations_cache = {loc.name: loc.id for loc in (await db.execute(select(Location))).scalars().all()}
    incidents_cache = {inc.name: inc.id for inc in (await db.execute(select(IncidentType))).scalars().all()}
    vehicles_cache = {v.vehicle_number: v.id for v in (await db.execute(select(Vehicle))).scalars().all()}

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
                cid = name_to_cat.get(inc)
                i = IncidentType(name=inc, category_id=cid)
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

            time_val = parse_time(row["Time"] if "Time" in row else None)
            ndir = normalize_direction(row["Direction"] if "Direction" in row else None)

            raw_delay = row["Min.Delay"] if pd.notna(row.get("Min.Delay")) else None
            min_delay = int(raw_delay) if raw_delay is not None else None

            raw_gap = row["Min.Gap"] if pd.notna(row.get("Min.Gap")) else None
            min_gap = int(raw_gap) if raw_gap is not None else None

            hour = time_val.hour if time_val else None
            month = report_date.month if report_date else None
            year = report_date.year if report_date else None

            records.append(DelayRecord(
                report_date=report_date,
                time=time_val,
                day=str(row["Day"]).strip() if pd.notna(row.get("Day")) else None,
                min_delay=min_delay,
                min_gap=min_gap,
                direction=str(row["Direction"]).strip() if pd.notna(row.get("Direction")) else None,
                delay_hours=round((min_delay or 0) / 60, 4) if min_delay else 0,
                delay_severity=get_severity(min_delay),
                time_slot=get_time_slot(hour),
                season=get_season(month),
                is_weekend=str(row.get("Day", "")).strip() in ("Saturday", "Sunday") if pd.notna(row.get("Day")) else None,
                normalized_direction=ndir,
                year=year,
                month=month,
                week=report_date.isocalendar()[1] if report_date else None,
                quarter=(month - 1) // 3 + 1 if month else None,
                route_id=routes_cache.get(code) if code else None,
                location_id=locations_cache[loc],
                incident_type_id=incidents_cache[inc],
                vehicle_id=vehicles_cache.get(vnum) if vnum is not None else None,
            ))

        db.add_all(records)
        await db.commit()
        print(f"  Inserted {len(records)} records from {os.path.basename(filepath)}")

    print("All data loaded successfully.")
