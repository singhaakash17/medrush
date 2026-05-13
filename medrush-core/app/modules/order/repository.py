from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone
from app.modules.order.models import Order, OrderItem, OrderStatusHistory, OrderRating
from app.modules.order.schemas import OrderOut, OrderWithItemsOut, OrderItemOut, OrderStatusHistoryOut


async def get_order_by_id(session: AsyncSession, order_id: str) -> OrderOut | None:
    result = await session.execute(select(Order).where(Order.id == order_id))
    row = result.scalar_one_or_none()
    return OrderOut.model_validate(row) if row else None


async def get_order_row(session: AsyncSession, order_id: str) -> Order | None:
    result = await session.execute(select(Order).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def list_orders_by_user(session: AsyncSession, principal_id: str) -> list[OrderOut]:
    result = await session.execute(
        select(Order).where(Order.principal_id == principal_id).order_by(Order.placed_at.desc())
    )
    return [OrderOut.model_validate(row) for row in result.scalars()]


async def list_orders_by_pharmacy(
    session: AsyncSession, pharmacy_id: str, statuses: list[str] | None = None
) -> list[OrderWithItemsOut]:
    q = select(Order).where(Order.pharmacy_id == pharmacy_id)
    if statuses:
        q = q.where(Order.status.in_(statuses))
    q = q.order_by(Order.placed_at.desc())
    result = await session.execute(q)
    orders = list(result.scalars())

    # Fetch items for all returned orders in one query
    order_ids = [o.id for o in orders]
    items_result = await session.execute(
        select(OrderItem).where(OrderItem.order_id.in_(order_ids))
    )
    items_by_order: dict[str, list[OrderItemOut]] = {}
    for item in items_result.scalars():
        items_by_order.setdefault(item.order_id, []).append(OrderItemOut.model_validate(item))

    return [
        OrderWithItemsOut(**OrderOut.model_validate(o).model_dump(), items=items_by_order.get(o.id, []))
        for o in orders
    ]


async def create_order(session: AsyncSession, order: Order) -> Order:
    session.add(order)
    await session.flush()
    return order


async def create_order_items(session: AsyncSession, items: list[OrderItem]) -> None:
    for item in items:
        session.add(item)
    await session.flush()


async def append_status_history(
    session: AsyncSession,
    order_id: str,
    from_status: str | None,
    to_status: str,
    actor_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    entry = OrderStatusHistory(
        order_id=order_id,
        from_status=from_status,
        to_status=to_status,
        actor_id=actor_id,
        metadata=metadata,
        occurred_at=datetime.now(timezone.utc),
    )
    session.add(entry)
    await session.flush()


async def list_order_items(session: AsyncSession, order_id: str) -> list[OrderItemOut]:
    result = await session.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    return [OrderItemOut.model_validate(row) for row in result.scalars()]


async def list_status_history(session: AsyncSession, order_id: str) -> list[OrderStatusHistoryOut]:
    result = await session.execute(
        select(OrderStatusHistory).where(OrderStatusHistory.order_id == order_id)
        .order_by(OrderStatusHistory.occurred_at)
    )
    return [OrderStatusHistoryOut.model_validate(row) for row in result.scalars()]


async def update_order_status(
    session: AsyncSession,
    order_id: str,
    status: str,
    timestamp_field: str | None = None,
    cancellation_reason: str | None = None,
) -> None:
    values: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if timestamp_field:
        values[timestamp_field] = datetime.now(timezone.utc)
    if cancellation_reason:
        values["cancellation_reason"] = cancellation_reason
    await session.execute(update(Order).where(Order.id == order_id).values(**values))


async def create_rating(session: AsyncSession, rating: OrderRating) -> None:
    session.add(rating)
    await session.flush()
