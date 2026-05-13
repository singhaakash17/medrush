from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.catalog.repository import (
    get_medicine,
    search_medicines,
    list_warnings,
    get_substitutes,
    get_featured_medicines,
)
from app.modules.catalog.schemas import MedicineOut, MedicineWarningOut, SubstituteOut
from app.lib.errors import NotFoundError


async def fetch_medicine(session: AsyncSession, medicine_id: str) -> MedicineOut:
    medicine = await get_medicine(session, medicine_id)
    if not medicine:
        raise NotFoundError(f"Medicine {medicine_id} not found")
    return medicine


async def search(session: AsyncSession, q: str) -> list[MedicineOut]:
    return await search_medicines(session, q)


async def get_warnings(session: AsyncSession, medicine_id: str) -> list[MedicineWarningOut]:
    return await list_warnings(session, medicine_id)


async def get_substitutes_for(session: AsyncSession, medicine_id: str) -> list[SubstituteOut]:
    return await get_substitutes(session, medicine_id)


async def get_featured(session: AsyncSession) -> list[MedicineOut]:
    return await get_featured_medicines(session)
