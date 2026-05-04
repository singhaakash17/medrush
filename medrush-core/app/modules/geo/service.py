from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.geo.repository import list_active_service_areas, get_service_area
from app.modules.geo.schemas import ServiceAreaOut
from app.lib.errors import NotFoundError


async def get_service_areas(session: AsyncSession, city: str | None = None) -> list[ServiceAreaOut]:
    return await list_active_service_areas(session, city)


async def fetch_service_area(session: AsyncSession, area_id: str) -> ServiceAreaOut:
    area = await get_service_area(session, area_id)
    if not area:
        raise NotFoundError(f"Service area {area_id} not found")
    return area
