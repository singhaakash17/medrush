from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.rx.repository import get_prescription, list_by_user, list_rx_items, list_rx_flags
from app.modules.rx.schemas import PrescriptionOut, RxItemOut, RxFlagOut
from app.lib.errors import NotFoundError


async def fetch_prescription(session: AsyncSession, rx_id: str) -> PrescriptionOut:
    rx = await get_prescription(session, rx_id)
    if not rx:
        raise NotFoundError(f"Prescription {rx_id} not found")
    return rx


async def get_user_prescriptions(session: AsyncSession, principal_id: str) -> list[PrescriptionOut]:
    return await list_by_user(session, principal_id)


async def get_rx_items(session: AsyncSession, rx_id: str) -> list[RxItemOut]:
    return await list_rx_items(session, rx_id)


async def get_rx_flags(session: AsyncSession, rx_id: str) -> list[RxFlagOut]:
    return await list_rx_flags(session, rx_id)
