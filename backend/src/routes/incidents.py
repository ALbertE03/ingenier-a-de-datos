from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from src.db.session import get_db
from src.db import models
from src.utils import auth

router = APIRouter(prefix="/incidents", tags=["Incidencias"])


class IncidentCreate(BaseModel):
    incident_type: str
    description: str | None = None
    route_code: str | None = None
    vehicle_number: int | None = None
    report_date: date


class IncidentOut(BaseModel):
    id: int
    incident_type: str
    description: str | None
    route: str | None
    vehicle: int | None
    report_date: date
    status: str
    created_by: str
    created_at: date
    resolved_at: date | None

    model_config = {"from_attributes": True}


@router.post("", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.require_inspector),
):
    route_id = None
    if data.route_code:
        r = await db.execute(select(models.Route).filter(models.Route.code == data.route_code))
        route = r.scalar_one_or_none()
        if route:
            route_id = route.id

    vehicle_id = None
    if data.vehicle_number:
        v = await db.execute(select(models.Vehicle).filter(models.Vehicle.vehicle_number == data.vehicle_number))
        vehicle = v.scalar_one_or_none()
        if vehicle:
            vehicle_id = vehicle.id

    incident = models.Incident(
        incident_type=data.incident_type,
        description=data.description,
        route_id=route_id,
        vehicle_id=vehicle_id,
        report_date=data.report_date,
        status="open",
        created_by=current_user.id,
        created_at=date.today(),
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return await _serialize(incident, db)


@router.get("", response_model=list[IncidentOut])
async def list_incidents(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    q = select(models.Incident)
    if status_filter:
        q = q.filter(models.Incident.status == status_filter)
    q = q.order_by(desc(models.Incident.created_at))
    result = await db.execute(q)
    incidents = result.scalars().all()
    return [await _serialize(i, db) for i in incidents]


@router.patch("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(auth.require_inspector),
):
    result = await db.execute(select(models.Incident).filter(models.Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidencia no encontrada")
    incident.status = "resolved"
    incident.resolved_at = date.today()
    await db.commit()
    await db.refresh(incident)
    return await _serialize(incident, db)


async def _serialize(inc: models.Incident, db: AsyncSession) -> dict:
    route_code = None
    if inc.route_id:
        r = await db.execute(select(models.Route.code).filter(models.Route.id == inc.route_id))
        route_code = r.scalar()

    vehicle_num = None
    if inc.vehicle_id:
        v = await db.execute(select(models.Vehicle.vehicle_number).filter(models.Vehicle.id == inc.vehicle_id))
        vehicle_num = v.scalar()

    creator = None
    if inc.created_by:
        u = await db.execute(select(models.User.username).filter(models.User.id == inc.created_by))
        creator = u.scalar()

    return {
        "id": inc.id,
        "incident_type": inc.incident_type,
        "description": inc.description,
        "route": route_code,
        "vehicle": vehicle_num,
        "report_date": inc.report_date,
        "status": inc.status,
        "created_by": creator or "",
        "created_at": inc.created_at,
        "resolved_at": inc.resolved_at,
    }
