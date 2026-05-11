from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone, timedelta
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


async def get_inventory_row(session: AsyncSession, pharmacy_id: str, medicine_id: str) -> InventoryItem | None:
    result = await session.execute(
        select(InventoryItem).where(
            InventoryItem.pharmacy_id == pharmacy_id,
            InventoryItem.medicine_id == medicine_id,
        ).with_for_update()
    )
    return result.scalar_one_or_none()


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


async def reserve_stock(
    session: AsyncSession,
    reservation_id: str,
    pharmacy_id: str,
    medicine_id: str,
    order_id: str,
    qty: int,
    ttl_seconds: int = 600,
) -> None:
    """Hard-reserve qty units. Increments qty_reserved on InventoryItem."""
    now = datetime.now(timezone.utc)
    row = await get_inventory_row(session, pharmacy_id, medicine_id)
    if row is None or (row.qty_available is not None and row.qty_available < qty):
        raise ValueError(f"Insufficient stock: pharmacy={pharmacy_id} medicine={medicine_id}")

    await session.execute(
        update(InventoryItem)
        .where(InventoryItem.pharmacy_id == pharmacy_id, InventoryItem.medicine_id == medicine_id)
        .values(qty_reserved=InventoryItem.qty_reserved + qty, updated_at=now)
    )

    reservation = Reservation(
        id=reservation_id,
        pharmacy_id=pharmacy_id,
        medicine_id=medicine_id,
        order_id=order_id,
        qty=qty,
        state="hard",
        expires_at=now + timedelta(seconds=ttl_seconds),
        created_at=now,
        state_changed_at=now,
    )
    session.add(reservation)

    ledger_entry = InventoryLedger(
        pharmacy_id=pharmacy_id,
        medicine_id=medicine_id,
        delta_qty=-qty,
        reason="reservation",
        reference_id=order_id,
        qty_after=(row.qty_on_hand - row.qty_reserved - qty),
        occurred_at=now,
    )
    session.add(ledger_entry)
    await session.flush()


async def release_reservation(session: AsyncSession, order_id: str) -> None:
    """Release all reservations for an order (on cancel/fail)."""
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(Reservation).where(Reservation.order_id == order_id, Reservation.state.in_(["hard", "soft"]))
    )
    reservations = result.scalars().all()
    for res in reservations:
        await session.execute(
            update(InventoryItem)
            .where(
                InventoryItem.pharmacy_id == res.pharmacy_id,
                InventoryItem.medicine_id == res.medicine_id,
            )
            .values(qty_reserved=InventoryItem.qty_reserved - res.qty, updated_at=now)
        )
        await session.execute(
            update(Reservation)
            .where(Reservation.id == res.id)
            .values(state="released", state_changed_at=now)
        )
    await session.flush()


async def commit_reservation(session: AsyncSession, order_id: str) -> None:
    """Commit reservations (deduct from qty_on_hand) on delivery."""
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(Reservation).where(Reservation.order_id == order_id, Reservation.state == "hard")
    )
    reservations = result.scalars().all()
    for res in reservations:
        await session.execute(
            update(InventoryItem)
            .where(
                InventoryItem.pharmacy_id == res.pharmacy_id,
                InventoryItem.medicine_id == res.medicine_id,
            )
            .values(
                qty_on_hand=InventoryItem.qty_on_hand - res.qty,
                qty_reserved=InventoryItem.qty_reserved - res.qty,
                updated_at=now,
            )
        )
        await session.execute(
            update(Reservation)
            .where(Reservation.id == res.id)
            .values(state="committed", state_changed_at=now)
        )
    await session.flush()


async def toggle_listing(
    session: AsyncSession, pharmacy_id: str, medicine_id: str, is_listed: bool, reason: str | None = None
) -> InventoryItemOut | None:
    now = datetime.now(timezone.utc)
    values: dict = {"is_listed": is_listed, "updated_at": now}
    if not is_listed:
        values["unlisted_reason"] = reason or "manual"
    else:
        values["unlisted_reason"] = None
    await session.execute(
        update(InventoryItem)
        .where(InventoryItem.pharmacy_id == pharmacy_id, InventoryItem.medicine_id == medicine_id)
        .values(**values)
    )
    await session.flush()
    return await get_inventory_item(session, pharmacy_id, medicine_id)
