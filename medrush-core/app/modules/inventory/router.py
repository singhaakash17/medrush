from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.inventory.schemas import InventoryItemOut, InventoryBatchOut, ReservationOut, InventoryLedgerOut
from app.modules.inventory import service

router = APIRouter()


@router.get("/check", response_model=InventoryItemOut)
async def check_availability(
    pharmacy_id: str = Query(...),
    medicine_id: str = Query(...),
    session: AsyncSession = Depends(get_async_session),
) -> InventoryItemOut:
    return await service.check_availability(session, pharmacy_id, medicine_id)


@router.get("/pharmacies/{pharmacy_id}", response_model=list[InventoryItemOut])
async def list_pharmacy_inventory(
    pharmacy_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[InventoryItemOut]:
    return await service.get_pharmacy_inventory(session, pharmacy_id)


@router.get("/pharmacies/{pharmacy_id}/medicines/{medicine_id}/batches", response_model=list[InventoryBatchOut])
async def list_batches(
    pharmacy_id: str,
    medicine_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[InventoryBatchOut]:
    return await service.get_batches(session, pharmacy_id, medicine_id)


@router.get("/pharmacies/{pharmacy_id}/medicines/{medicine_id}/ledger", response_model=list[InventoryLedgerOut])
async def get_ledger(
    pharmacy_id: str,
    medicine_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[InventoryLedgerOut]:
    return await service.get_ledger(session, pharmacy_id, medicine_id)


@router.get("/reservations/orders/{order_id}", response_model=list[ReservationOut])
async def list_order_reservations(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[ReservationOut]:
    return await service.get_order_reservations(session, order_id)
