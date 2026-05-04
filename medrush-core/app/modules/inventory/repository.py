from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.inventory.models import InventoryItem, InventoryBatch, Reservation, InventoryLedger
from app.modules.inventory.schemas import InventoryItemOut, InventoryBatchOut, ReservationOut, InventoryLedgerOut


async def get_inventory_item(session: AsyncSession, pharmacy_id: str, medicine_id: str) -> InventoryItemOut | None:
    result = await session.execute(
        select(InventoryItem).where(
            InventoryItem.pharmacy_id == pharmacy_id,
            InventoryItem.medicine_id == medicine_id,
            InventoryItem.is_listed == True,  # noqa: E712
        )
    )
    row = result.scalar_one_or_none()
    return InventoryItemOut.model_validate(row) if row else None


async def list_inventory_by_pharmacy(session: AsyncSession, pharmacy_id: str) -> list[InventoryItemOut]:
    result = await session.execute(
        select(InventoryItem)
        .where(InventoryItem.pharmacy_id == pharmacy_id, InventoryItem.is_listed == True)  # noqa: E712
        .order_by(InventoryItem.medicine_id)
    )
    return [InventoryItemOut.model_validate(row) for row in result.scalars()]


async def list_batches(session: AsyncSession, pharmacy_id: str, medicine_id: str) -> list[InventoryBatchOut]:
    result = await session.execute(
        select(InventoryBatch)
        .where(InventoryBatch.pharmacy_id == pharmacy_id, InventoryBatch.medicine_id == medicine_id)
        .order_by(InventoryBatch.expiry_date)
    )
    return [InventoryBatchOut.model_validate(row) for row in result.scalars()]


async def list_reservations_by_order(session: AsyncSession, order_id: str) -> list[ReservationOut]:
    result = await session.execute(select(Reservation).where(Reservation.order_id == order_id))
    return [ReservationOut.model_validate(row) for row in result.scalars()]


async def list_ledger_entries(session: AsyncSession, pharmacy_id: str, medicine_id: str, limit: int = 50) -> list[InventoryLedgerOut]:
    result = await session.execute(
        select(InventoryLedger)
        .where(InventoryLedger.pharmacy_id == pharmacy_id, InventoryLedger.medicine_id == medicine_id)
        .order_by(InventoryLedger.occurred_at.desc())
        .limit(limit)
    )
    return [InventoryLedgerOut.model_validate(row) for row in result.scalars()]
