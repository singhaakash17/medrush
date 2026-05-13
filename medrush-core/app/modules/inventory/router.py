from fastapi import APIRouter, Depends, Query, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.inventory.schemas import (
    InventoryItemOut, InventoryBatchOut, ReservationOut, InventoryLedgerOut,
    ReceiveBatchIn, AlertsOut,
)
from app.modules.inventory import service
from typing import Literal, Optional
from datetime import date


class ToggleListingIn(BaseModel):
    is_listed: bool
    reason: str | None = None


class AdjustStockIn(BaseModel):
    delta: int                          # positive = restock, negative = write-off
    reason: Literal[
        "restock", "write_off", "damage", "expiry", "correction", "theft",
        "walk_in_sale", "erp_sync",
    ] = "restock"
    notes: str | None = None


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


@router.patch("/pharmacies/{pharmacy_id}/medicines/{medicine_id}/listing", response_model=InventoryItemOut)
async def toggle_listing(
    pharmacy_id: str,
    medicine_id: str,
    payload: ToggleListingIn,
    session: AsyncSession = Depends(get_async_session),
) -> InventoryItemOut:
    return await service.toggle_listing(session, pharmacy_id, medicine_id, payload.is_listed, payload.reason)


@router.post("/pharmacies/{pharmacy_id}/medicines/{medicine_id}/adjust", response_model=InventoryItemOut)
async def adjust_stock(
    pharmacy_id: str,
    medicine_id: str,
    payload: AdjustStockIn,
    x_user_id: str = Header("system", alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> InventoryItemOut:
    """Manual stock adjustment — restock, write-off, damage, correction, walk-in sale, etc.
    delta > 0 adds stock, delta < 0 removes stock."""
    return await service.adjust_stock(
        session, pharmacy_id, medicine_id,
        delta=payload.delta, reason=payload.reason,
        notes=payload.notes, actor_id=x_user_id,
    )


@router.post("/pharmacies/{pharmacy_id}/medicines/{medicine_id}/receive", response_model=InventoryItemOut)
async def receive_stock(
    pharmacy_id: str,
    medicine_id: str,
    payload: ReceiveBatchIn,
    x_user_id: str = Header("system", alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> InventoryItemOut:
    """Record incoming stock from a supplier. Creates an InventoryBatch and increments qty_on_hand."""
    return await service.receive_stock(
        session, pharmacy_id, medicine_id,
        batch_no=payload.batch_no,
        expiry_date=payload.expiry_date,
        qty_received=payload.qty_received,
        manufacture_date=payload.manufacture_date,
        cost_paise=payload.cost_paise,
        notes=payload.notes,
        actor_id=x_user_id,
    )


@router.get("/pharmacies/{pharmacy_id}/alerts", response_model=AlertsOut)
async def get_alerts(
    pharmacy_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> AlertsOut:
    """Returns low-stock items and batches expiring within 90 days."""
    return await service.get_alerts(session, pharmacy_id)


@router.get("/pharmacies/{pharmacy_id}/ledger", response_model=list[InventoryLedgerOut])
async def get_pharmacy_ledger(
    pharmacy_id: str,
    limit: int = Query(200, le=500),
    session: AsyncSession = Depends(get_async_session),
) -> list[InventoryLedgerOut]:
    """All recent inventory transactions across all medicines for a pharmacy."""
    return await service.get_sales_ledger(session, pharmacy_id, limit)
