from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.geo.schemas import ServiceAreaOut
from app.modules.geo import service

router = APIRouter()


@router.get("/service-areas", response_model=list[ServiceAreaOut])
async def list_service_areas(
    city: str | None = Query(None),
    session: AsyncSession = Depends(get_async_session),
) -> list[ServiceAreaOut]:
    return await service.get_service_areas(session, city)


@router.get("/service-areas/{area_id}", response_model=ServiceAreaOut)
async def get_service_area(
    area_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> ServiceAreaOut:
    return await service.fetch_service_area(session, area_id)
