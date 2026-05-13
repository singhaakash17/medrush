"""
Order placement saga:
  1. Validate items against inventory
  2. Reserve stock (hard reservation)
  3. Persist Order + OrderItems + StatusHistory
  4. Publish kafka event / WebSocket notification to pharmacy
  5. Initiate payment (if not COD)
"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.order.repository import (
    get_order_by_id, get_order_row, list_orders_by_user, list_orders_by_pharmacy,
    list_order_items, list_status_history, create_order, create_order_items,
    append_status_history, update_order_status, create_rating,
)
from app.modules.order.schemas import (
    OrderOut, OrderWithItemsOut, OrderItemOut, OrderStatusHistoryOut,
    PlaceOrderIn, UpdateOrderStatusIn, RateOrderIn,
)
from app.modules.order.models import Order, OrderItem, OrderRating
from app.modules.inventory.repository import reserve_stock, release_reservation, commit_reservation
from app.modules.catalog.repository import get_medicine
from app.modules.ws.manager import manager
from app.kafka.events import publish_event
from app.modules.notification.service import send_order_status_push
from app.lib.errors import NotFoundError, AppValidationError, ForbiddenError

SLA_MINUTES = 15
DELIVERY_FEE_PAISE = 1900  # ₹19
PLATFORM_FEE_PAISE = 200   # ₹2


def _short_code() -> str:
    return "MR" + "".join(random.choices(string.digits, k=6))


async def place_order(
    session: AsyncSession,
    principal_id: str,
    payload: PlaceOrderIn,
) -> OrderOut:
    now = datetime.now(timezone.utc)
    order_id = str(uuid.uuid4())
    short_code = _short_code()
    sla_target = now + timedelta(minutes=SLA_MINUTES)

    # Build line items
    order_items: list[OrderItem] = []
    subtotal = 0
    tax = 0

    for item_in in payload.items:
        med = await get_medicine(session, item_in.medicine_id)
        if not med:
            raise NotFoundError(f"Medicine {item_in.medicine_id} not found in catalog")

        # Fetch selling price from inventory
        from app.modules.inventory.repository import get_inventory_item
        inv = await get_inventory_item(session, payload.pharmacy_id, item_in.medicine_id)
        if not inv:
            raise AppValidationError(
                f"Medicine '{med.brand_name}' not available at selected pharmacy"
            )
        if (inv.qty_available or 0) < item_in.qty:
            raise AppValidationError(
                f"Only {inv.qty_available} units of '{med.brand_name}' available"
            )

        unit_price = inv.selling_price_paise
        line_total = unit_price * item_in.qty
        gst_on_line = round(line_total * med.gst_rate_bps / 1_000_000)
        subtotal += line_total
        tax += gst_on_line

        order_items.append(OrderItem(
            id=str(uuid.uuid4()),
            order_id=order_id,
            medicine_id=item_in.medicine_id,
            medicine_name=med.brand_name,
            qty=item_in.qty,
            unit_price_paise=unit_price,
            total_paise=line_total,
            is_rx_item=med.rx_required,
        ))

    # Rx validation: if any item needs Rx, rx_id must be provided
    needs_rx = any(i.is_rx_item for i in order_items)
    if needs_rx and not payload.rx_id:
        raise AppValidationError(
            "One or more items require a prescription. Please upload and attach your Rx."
        )

    total = subtotal + DELIVERY_FEE_PAISE + PLATFORM_FEE_PAISE + tax

    order = Order(
        id=order_id,
        short_code=short_code,
        principal_id=principal_id,
        pharmacy_id=payload.pharmacy_id,
        status="pending",
        delivery_address=payload.delivery_address.model_dump(),
        rx_id=payload.rx_id,
        coupon_code=payload.coupon_code,
        subtotal_paise=subtotal,
        discount_paise=0,
        delivery_fee_paise=DELIVERY_FEE_PAISE,
        platform_fee_paise=PLATFORM_FEE_PAISE,
        tax_paise=tax,
        total_paise=total,
        sla_target_at=sla_target,
        placed_at=now,
        created_at=now,
        updated_at=now,
    )

    # Reserve stock for each item
    for item_in, order_item in zip(payload.items, order_items):
        await reserve_stock(
            session,
            reservation_id=str(uuid.uuid4()),
            pharmacy_id=payload.pharmacy_id,
            medicine_id=item_in.medicine_id,
            order_id=order_id,
            qty=item_in.qty,
        )

    await create_order(session, order)
    await create_order_items(session, order_items)
    await append_status_history(session, order_id, None, "pending", principal_id)
    await session.commit()

    order_out = await get_order_by_id(session, order_id)

    # Notify pharmacy via WebSocket
    await manager.send_to_room(
        f"pharmacy:{payload.pharmacy_id}",
        "new_order",
        {
            "order_id": order_id,
            "short_code": short_code,
            "sla_target_at": sla_target.isoformat(),
            "total_paise": total,
            "item_count": len(order_items),
        },
    )

    # Kafka event (stub-safe)
    await publish_event("order.placed", {
        "order_id": order_id,
        "pharmacy_id": payload.pharmacy_id,
        "principal_id": principal_id,
        "total_paise": total,
        "sla_target_at": sla_target.isoformat(),
    })

    return order_out


async def transition_status(
    session: AsyncSession,
    order_id: str,
    actor_id: str,
    payload: UpdateOrderStatusIn,
) -> OrderOut:
    order = await get_order_row(session, order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")

    # Allowed transitions
    allowed: dict[str, list[str]] = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["packed", "cancelled"],
        "packed": ["dispatched"],
        "dispatched": ["delivered"],
        "delivered": [],
        "cancelled": [],
    }
    if payload.status not in allowed.get(order.status, []):
        raise AppValidationError(
            f"Cannot move order from '{order.status}' to '{payload.status}'"
        )

    timestamp_map = {
        "confirmed": "confirmed_at",
        "dispatched": "dispatched_at",
        "delivered": "delivered_at",
        "cancelled": "cancelled_at",
    }

    await update_order_status(
        session, order_id, payload.status,
        timestamp_field=timestamp_map.get(payload.status),
        cancellation_reason=payload.reason if payload.status == "cancelled" else None,
    )
    await append_status_history(session, order_id, order.status, payload.status, actor_id)

    if payload.status == "delivered":
        await commit_reservation(session, order_id)
    elif payload.status == "cancelled":
        await release_reservation(session, order_id)

    await session.commit()

    order_out = await get_order_by_id(session, order_id)

    # Broadcast to customer tracking room
    await manager.send_to_room(
        f"order:{order_id}",
        "status_update",
        {
            "order_id": order_id,
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    await publish_event("order.status_changed", {
        "order_id": order_id,
        "from_status": order.status,
        "to_status": payload.status,
        "actor_id": actor_id,
    })

    # Push notification to customer (best-effort, never blocks order flow)
    try:
        await send_order_status_push(
            session,
            principal_id=order.principal_id,
            order_id=order_id,
            order_short_code=order_out.short_code,
            new_status=payload.status,
        )
    except Exception:
        pass

    return order_out


async def fetch_order(session: AsyncSession, order_id: str) -> OrderOut:
    order = await get_order_by_id(session, order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")
    return order


async def get_user_orders(session: AsyncSession, principal_id: str) -> list[OrderOut]:
    return await list_orders_by_user(session, principal_id)


async def get_pharmacy_orders(
    session: AsyncSession, pharmacy_id: str, statuses: list[str] | None = None
) -> list[OrderWithItemsOut]:
    return await list_orders_by_pharmacy(session, pharmacy_id, statuses)


async def get_order_items(session: AsyncSession, order_id: str) -> list[OrderItemOut]:
    return await list_order_items(session, order_id)


async def get_status_history(session: AsyncSession, order_id: str) -> list[OrderStatusHistoryOut]:
    return await list_status_history(session, order_id)


async def rate_order(
    session: AsyncSession, order_id: str, principal_id: str, payload: RateOrderIn
) -> None:
    order = await get_order_row(session, order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")
    if order.principal_id != principal_id:
        raise ForbiddenError("Not your order")
    if order.status != "delivered":
        raise AppValidationError("Can only rate delivered orders")

    rating = OrderRating(
        order_id=order_id,
        principal_id=principal_id,
        pharmacy_rating=payload.pharmacy_rating,
        delivery_rating=payload.delivery_rating,
        comment=payload.comment,
        rated_at=datetime.now(timezone.utc),
    )
    await create_rating(session, rating)
    await session.commit()
