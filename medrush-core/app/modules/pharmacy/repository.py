from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.pharmacy.models import Pharmacy, Pharmacist
from app.modules.pharmacy.schemas import PharmacyOut, PharmacistOut


async def get_pharmacy_by_id(session: AsyncSession, pharmacy_id: str) -> PharmacyOut | None:
    result = await session.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
    row = result.scalar_one_or_none()
    return PharmacyOut.model_validate(row) if row else None


async def list_pharmacies_by_owner(session: AsyncSession, owner_principal_id: str) -> list[PharmacyOut]:
    result = await session.execute(
        select(Pharmacy).where(Pharmacy.owner_principal_id == owner_principal_id)
    )
    return [PharmacyOut.model_validate(row) for row in result.scalars()]


async def list_pharmacists(session: AsyncSession, pharmacy_id: str) -> list[PharmacistOut]:
    result = await session.execute(
        select(Pharmacist).where(
            Pharmacist.pharmacy_id == pharmacy_id,
            Pharmacist.is_active == True,  # noqa: E712
        )
    )
    return [PharmacistOut.model_validate(row) for row in result.scalars()]
