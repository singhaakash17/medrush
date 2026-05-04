from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.catalog.repository import get_medicine, search_medicines, list_warnings
from app.modules.catalog.schemas import MedicineOut, MedicineWarningOut
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
