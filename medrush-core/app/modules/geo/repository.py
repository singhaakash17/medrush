from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.geo.models import ServiceArea
from app.modules.geo.schemas import ServiceAreaOut


async def list_active_service_areas(session: AsyncSession, city: str | None = None) -> list[ServiceAreaOut]:
    q = select(ServiceArea).where(ServiceArea.is_active == True)  # noqa: E712
    if city:
        q = q.where(ServiceArea.city == city)
    result = await session.execute(q)
    return [ServiceAreaOut.model_validate(row) for row in result.scalars()]


async def get_service_area(session: AsyncSession, area_id: str) -> ServiceAreaOut | None:
    result = await session.execute(select(ServiceArea).where(ServiceArea.id == area_id))
    row = result.scalar_one_or_none()
    return ServiceAreaOut.model_validate(row) if row else None
