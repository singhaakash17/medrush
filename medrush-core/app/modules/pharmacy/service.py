from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.pharmacy.repository import get_pharmacy_by_id, list_pharmacies_by_owner, list_pharmacists
from app.modules.pharmacy.schemas import PharmacyOut, PharmacistOut
from app.lib.errors import NotFoundError


async def fetch_pharmacy(session: AsyncSession, pharmacy_id: str) -> PharmacyOut:
    pharmacy = await get_pharmacy_by_id(session, pharmacy_id)
    if not pharmacy:
        raise NotFoundError(f"Pharmacy {pharmacy_id} not found")
    return pharmacy


async def get_owner_pharmacies(session: AsyncSession, principal_id: str) -> list[PharmacyOut]:
    return await list_pharmacies_by_owner(session, principal_id)


async def get_pharmacists(session: AsyncSession, pharmacy_id: str) -> list[PharmacistOut]:
    return await list_pharmacists(session, pharmacy_id)
