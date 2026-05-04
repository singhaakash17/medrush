from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.inventory.repository import (
    get_inventory_item, list_inventory_by_pharmacy, list_batches,
    list_reservations_by_order, list_ledger_entries,
)
from app.modules.inventory.schemas import InventoryItemOut, InventoryBatchOut, ReservationOut, InventoryLedgerOut
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
