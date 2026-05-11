from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.modules.rx.models import Prescription, RxItem, RxFlag, VerificationQueue
from app.modules.rx.schemas import PrescriptionOut, RxItemOut, RxFlagOut


async def get_prescription(session: AsyncSession, rx_id: str) -> PrescriptionOut | None:
    result = await session.execute(select(Prescription).where(Prescription.id == rx_id))
    row = result.scalar_one_or_none()
    return PrescriptionOut.model_validate(row) if row else None


async def get_prescription_row(session: AsyncSession, rx_id: str) -> Prescription | None:
    result = await session.execute(select(Prescription).where(Prescription.id == rx_id))
    return result.scalar_one_or_none()


async def list_by_user(session: AsyncSession, principal_id: str) -> list[PrescriptionOut]:
    result = await session.execute(
        select(Prescription)
        .where(Prescription.principal_id == principal_id)
        .order_by(Prescription.created_at.desc())
    )
    return [PrescriptionOut.model_validate(row) for row in result.scalars()]


async def create_prescription(session: AsyncSession, rx: Prescription) -> Prescription:
    session.add(rx)
    await session.flush()
    return rx


async def create_rx_items(session: AsyncSession, items: list[RxItem]) -> None:
    for item in items:
        session.add(item)
    await session.flush()


async def create_rx_flags(session: AsyncSession, flags: list[RxFlag]) -> None:
    for flag in flags:
        session.add(flag)
    await session.flush()


async def list_rx_items(session: AsyncSession, rx_id: str) -> list[RxItemOut]:
    result = await session.execute(select(RxItem).where(RxItem.rx_id == rx_id))
    return [RxItemOut.model_validate(row) for row in result.scalars()]


async def list_rx_flags(session: AsyncSession, rx_id: str) -> list[RxFlagOut]:
    result = await session.execute(select(RxFlag).where(RxFlag.rx_id == rx_id))
    return [RxFlagOut.model_validate(row) for row in result.scalars()]


async def update_ocr_result(
    session: AsyncSession,
    rx_id: str,
    ocr_status: str,
    confidence_bps: int | None,
    doctor_name: str | None,
    hospital_name: str | None,
) -> None:
    await session.execute(
        update(Prescription)
        .where(Prescription.id == rx_id)
        .values(
            ocr_status=ocr_status,
            ocr_confidence_bps=confidence_bps,
            doctor_name=doctor_name,
            hospital_name=hospital_name,
            updated_at=datetime.now(timezone.utc),
        )
    )
    await session.flush()


async def verify_prescription(
    session: AsyncSession, rx_id: str, verified_by: str, approved: bool
) -> None:
    now = datetime.now(timezone.utc)
    values: dict = {"updated_at": now}
    if approved:
        values["is_verified"] = True
        values["verified_by"] = verified_by
        values["verified_at"] = now
    else:
        values["is_verified"] = False
    await session.execute(update(Prescription).where(Prescription.id == rx_id).values(**values))
    await session.flush()


async def enqueue_for_verification(session: AsyncSession, queue_item: VerificationQueue) -> None:
    session.add(queue_item)
    await session.flush()
