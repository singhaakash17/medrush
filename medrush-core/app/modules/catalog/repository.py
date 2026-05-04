from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.catalog.models import Medicine, MedicineWarning
from app.modules.catalog.schemas import MedicineOut, MedicineWarningOut


async def get_medicine(session: AsyncSession, medicine_id: str) -> MedicineOut | None:
    result = await session.execute(
        select(Medicine).where(Medicine.id == medicine_id, Medicine.is_active == True)  # noqa: E712
    )
    row = result.scalar_one_or_none()
    return MedicineOut.model_validate(row) if row else None


async def search_medicines(session: AsyncSession, q: str, limit: int = 20) -> list[MedicineOut]:
    result = await session.execute(
        select(Medicine)
        .where(
            Medicine.is_active == True,  # noqa: E712
            Medicine.is_discontinued == False,  # noqa: E712
            Medicine.brand_name.ilike(f"%{q}%"),
        )
        .limit(limit)
    )
    return [MedicineOut.model_validate(row) for row in result.scalars()]


async def list_warnings(session: AsyncSession, medicine_id: str) -> list[MedicineWarningOut]:
    result = await session.execute(
        select(MedicineWarning).where(MedicineWarning.medicine_id == medicine_id)
    )
    return [MedicineWarningOut.model_validate(row) for row in result.scalars()]
