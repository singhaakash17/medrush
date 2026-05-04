from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.rx.schemas import PrescriptionOut, RxItemOut, RxFlagOut
from app.modules.rx import service

router = APIRouter()


@router.get("/", response_model=list[PrescriptionOut])
async def list_prescriptions(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[PrescriptionOut]:
    return await service.get_user_prescriptions(session, x_user_id)


@router.get("/{rx_id}", response_model=PrescriptionOut)
async def get_prescription(
    rx_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> PrescriptionOut:
    return await service.fetch_prescription(session, rx_id)


@router.get("/{rx_id}/items", response_model=list[RxItemOut])
async def get_rx_items(
    rx_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[RxItemOut]:
    return await service.get_rx_items(session, rx_id)


@router.get("/{rx_id}/flags", response_model=list[RxFlagOut])
async def get_rx_flags(
    rx_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[RxFlagOut]:
    return await service.get_rx_flags(session, rx_id)
