from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.rx.models import Prescription, RxItem, RxFlag
from app.modules.rx.schemas import PrescriptionOut, RxItemOut, RxFlagOut


async def get_prescription(session: AsyncSession, rx_id: str) -> PrescriptionOut | None:
    result = await session.execute(select(Prescription).where(Prescription.id == rx_id))
    row = result.scalar_one_or_none()
    return PrescriptionOut.model_validate(row) if row else None


async def list_by_user(session: AsyncSession, principal_id: str) -> list[PrescriptionOut]:
    result = await session.execute(
        select(Prescription)
        .where(Prescription.principal_id == principal_id)
        .order_by(Prescription.created_at.desc())
    )
    return [PrescriptionOut.model_validate(row) for row in result.scalars()]


async def list_rx_items(session: AsyncSession, rx_id: str) -> list[RxItemOut]:
    result = await session.execute(select(RxItem).where(RxItem.rx_id == rx_id))
    return [RxItemOut.model_validate(row) for row in result.scalars()]


async def list_rx_flags(session: AsyncSession, rx_id: str) -> list[RxFlagOut]:
    result = await session.execute(select(RxFlag).where(RxFlag.rx_id == rx_id))
    return [RxFlagOut.model_validate(row) for row in result.scalars()]
