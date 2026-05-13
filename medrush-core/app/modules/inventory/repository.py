from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone, timedelta, date
from app.modules.inventory.models import InventoryItem, InventoryBatch, Reservation, InventoryLedger
from app.modules.inventory.schemas import (
    InventoryItemOut, InventoryBatchOut, ReservationOut, InventoryLedgerOut,
    LowStockAlert, ExpiryAlert,
)


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


async def adjust_stock_qty(
    session: AsyncSession,
    pharmacy_id: str,
    medicine_id: str,
    delta: int,
    reason: str,
    actor_id: str | None = None,
    notes: str | None = None,
) -> InventoryItemOut | None:
    """Apply a manual delta to qty_on_hand and write a ledger entry."""
    now = datetime.now(timezone.utc)
    row = await get_inventory_row(session, pharmacy_id, medicine_id)
    if row is None:
        return None

    new_qty = row.qty_on_hand + delta
    if new_qty < row.qty_reserved:
        raise ValueError(
            f"Adjustment would leave qty_on_hand ({new_qty}) below qty_reserved ({row.qty_reserved})"
        )
    if new_qty < 0:
        raise ValueError(f"Adjustment would make qty_on_hand negative ({new_qty})")

    await session.execute(
        update(InventoryItem)
        .where(InventoryItem.pharmacy_id == pharmacy_id, InventoryItem.medicine_id == medicine_id)
        .values(qty_on_hand=new_qty, updated_at=now)
    )

    ledger_entry = InventoryLedger(
        pharmacy_id=pharmacy_id,
        medicine_id=medicine_id,
        delta_qty=delta,
        reason=reason,
        qty_after=new_qty,
        actor_id=actor_id,
        notes=notes,
        occurred_at=now,
    )
    session.add(ledger_entry)
    await session.flush()

    # Re-fetch to get computed qty_available
    result = await session.execute(
        select(InventoryItem).where(
            InventoryItem.pharmacy_id == pharmacy_id,
            InventoryItem.medicine_id == medicine_id,
        )
    )
    updated = result.scalar_one_or_none()
    return InventoryItemOut.model_validate(updated) if updated else None


async def receive_batch(
    session: AsyncSession,
    pharmacy_id: str,
    medicine_id: str,
    batch_id: str,
    batch_no: str,
    expiry_date: date,
    qty_received: int,
    manufacture_date: date | None = None,
    cost_paise: int | None = None,
    notes: str | None = None,
    actor_id: str | None = None,
) -> InventoryItemOut | None:
    """Record an incoming stock batch. Adds to qty_on_hand and creates InventoryBatch + ledger rows."""
    now = datetime.now(timezone.utc)
    row = await get_inventory_row(session, pharmacy_id, medicine_id)
    if row is None:
        return None

    # Create batch record
    batch = InventoryBatch(
        id=batch_id,
        pharmacy_id=pharmacy_id,
        medicine_id=medicine_id,
        batch_no=batch_no,
        manufacture_date=manufacture_date,
        expiry_date=expiry_date,
        qty_received=qty_received,
        qty_remaining=qty_received,
        cost_paise=cost_paise,
        received_at=now,
        created_at=now,
    )
    session.add(batch)

    new_qty = row.qty_on_hand + qty_received

    # Update inventory item — also refresh current_batch_no/expiry if this batch is newer
    update_values: dict = {"qty_on_hand": new_qty, "updated_at": now}
    if row.current_expiry is None or expiry_date > row.current_expiry:
        update_values["current_batch_no"] = batch_no
        update_values["current_expiry"] = expiry_date

    await session.execute(
        update(InventoryItem)
        .where(InventoryItem.pharmacy_id == pharmacy_id, InventoryItem.medicine_id == medicine_id)
        .values(**update_values)
    )

    ledger_entry = InventoryLedger(
        pharmacy_id=pharmacy_id,
        medicine_id=medicine_id,
        delta_qty=qty_received,
        reason="restock",
        reference_id=batch_id,
        qty_after=new_qty,
        actor_id=actor_id,
        notes=notes or f"Batch {batch_no} · Expiry {expiry_date}",
        occurred_at=now,
    )
    session.add(ledger_entry)
    await session.flush()

    result = await session.execute(
        select(InventoryItem).where(
            InventoryItem.pharmacy_id == pharmacy_id,
            InventoryItem.medicine_id == medicine_id,
        )
    )
    updated = result.scalar_one_or_none()
    return InventoryItemOut.model_validate(updated) if updated else None


async def get_low_stock_items(session: AsyncSession, pharmacy_id: str) -> list[LowStockAlert]:
    """Items where qty_available <= reorder_level (or < 5 if reorder_level is 0)."""
    result = await session.execute(
        select(InventoryItem).where(
            InventoryItem.pharmacy_id == pharmacy_id,
            InventoryItem.is_listed == True,  # noqa: E712
        )
    )
    items = result.scalars().all()
    alerts = []
    for item in items:
        available = item.qty_on_hand - item.qty_reserved
        threshold = max(item.reorder_level, 5)
        if available <= threshold:
            alerts.append(LowStockAlert(
                pharmacy_id=item.pharmacy_id,
                medicine_id=item.medicine_id,
                qty_available=available,
                reorder_level=item.reorder_level,
                current_expiry=item.current_expiry,
            ))
    return sorted(alerts, key=lambda a: a.qty_available)


async def get_expiring_batches(
    session: AsyncSession, pharmacy_id: str, within_days: int = 90
) -> list[ExpiryAlert]:
    """Batches expiring within `within_days` days that still have stock."""
    cutoff = datetime.now(timezone.utc).date() + timedelta(days=within_days)
    today = datetime.now(timezone.utc).date()
    result = await session.execute(
        select(InventoryBatch).where(
            InventoryBatch.pharmacy_id == pharmacy_id,
            InventoryBatch.expiry_date <= cutoff,
            InventoryBatch.qty_remaining > 0,
        ).order_by(InventoryBatch.expiry_date)
    )
    alerts = []
    for b in result.scalars():
        days_left = (b.expiry_date - today).days
        alerts.append(ExpiryAlert(
            id=b.id,
            pharmacy_id=b.pharmacy_id,
            medicine_id=b.medicine_id,
            batch_no=b.batch_no,
            expiry_date=b.expiry_date,
            qty_remaining=b.qty_remaining,
            days_until_expiry=days_left,
        ))
    return alerts


async def get_pharmacy_ledger(
    session: AsyncSession, pharmacy_id: str, limit: int = 200
) -> list[InventoryLedgerOut]:
    """All recent ledger entries across all medicines for a pharmacy."""
    result = await session.execute(
        select(InventoryLedger)
        .where(InventoryLedger.pharmacy_id == pharmacy_id)
        .order_by(InventoryLedger.occurred_at.desc())
        .limit(limit)
    )
    return [InventoryLedgerOut.model_validate(row) for row in result.scalars()]


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
