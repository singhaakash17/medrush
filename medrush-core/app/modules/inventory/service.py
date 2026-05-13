import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.inventory.repository import (
    get_inventory_item, list_inventory_by_pharmacy, list_batches,
    list_reservations_by_order, list_ledger_entries, toggle_listing as repo_toggle,
    adjust_stock_qty, receive_batch as repo_receive_batch,
    get_low_stock_items, get_expiring_batches, get_pharmacy_ledger,
)
from app.modules.inventory.schemas import (
    InventoryItemOut, InventoryBatchOut, ReservationOut, InventoryLedgerOut,
    AlertsOut,
)
from app.lib.errors import NotFoundError


async def check_availability(session: AsyncSession, pharmacy_id: str, medicine_id: str) -> InventoryItemOut:
    item = await get_inventory_item(session, pharmacy_id, medicine_id)
    if not item:
        raise NotFoundError(f"Inventory item not found for pharmacy={pharmacy_id} medicine={medicine_id}")
    return item


async def get_pharmacy_inventory(session: AsyncSession, pharmacy_id: str) -> list[InventoryItemOut]:
    return await list_inventory_by_pharmacy(session, pharmacy_id)


async def get_batches(session: AsyncSession, pharmacy_id: str, medicine_id: str) -> list[InventoryBatchOut]:
    return await list_batches(session, pharmacy_id, medicine_id)


async def get_order_reservations(session: AsyncSession, order_id: str) -> list[ReservationOut]:
    return await list_reservations_by_order(session, order_id)


async def get_ledger(session: AsyncSession, pharmacy_id: str, medicine_id: str) -> list[InventoryLedgerOut]:
    return await list_ledger_entries(session, pharmacy_id, medicine_id)


async def toggle_listing(
    session: AsyncSession, pharmacy_id: str, medicine_id: str, is_listed: bool, reason: str | None = None
) -> InventoryItemOut:
    item = await repo_toggle(session, pharmacy_id, medicine_id, is_listed, reason)
    await session.commit()
    if not item:
        raise NotFoundError(f"Inventory item not found for pharmacy={pharmacy_id} medicine={medicine_id}")
    return item


async def receive_stock(
    session: AsyncSession,
    pharmacy_id: str,
    medicine_id: str,
    batch_no: str,
    expiry_date: date,
    qty_received: int,
    manufacture_date: date | None = None,
    cost_paise: int | None = None,
    notes: str | None = None,
    actor_id: str | None = None,
) -> InventoryItemOut:
    """Receive a new stock batch from supplier. Creates InventoryBatch + updates qty_on_hand."""
    if qty_received <= 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="qty_received must be greater than 0")

    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    item = await repo_receive_batch(
        session, pharmacy_id, medicine_id, batch_id,
        batch_no, expiry_date, qty_received,
        manufacture_date, cost_paise, notes, actor_id,
    )
    if item is None:
        raise NotFoundError(f"Inventory item not found for pharmacy={pharmacy_id} medicine={medicine_id}")

    await session.commit()
    return item


async def get_alerts(session: AsyncSession, pharmacy_id: str) -> AlertsOut:
    low_stock = await get_low_stock_items(session, pharmacy_id)
    expiring_soon = await get_expiring_batches(session, pharmacy_id)
    return AlertsOut(low_stock=low_stock, expiring_soon=expiring_soon)


async def get_sales_ledger(
    session: AsyncSession, pharmacy_id: str, limit: int = 200
) -> list[InventoryLedgerOut]:
    return await get_pharmacy_ledger(session, pharmacy_id, limit)


async def adjust_stock(
    session: AsyncSession,
    pharmacy_id: str,
    medicine_id: str,
    delta: int,
    reason: str = "restock",
    notes: str | None = None,
    actor_id: str | None = None,
) -> InventoryItemOut:
    """Manual stock adjustment — restock, write-off, damage, correction, etc.
    delta > 0 adds stock, delta < 0 removes stock."""
    try:
        item = await adjust_stock_qty(session, pharmacy_id, medicine_id, delta, reason, actor_id, notes)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if item is None:
        raise NotFoundError(f"Inventory item not found for pharmacy={pharmacy_id} medicine={medicine_id}")

    await session.commit()
    return item
