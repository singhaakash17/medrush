from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.order.models import Order, OrderItem
from app.modules.order.schemas import OrderOut, OrderItemOut


async def get_order_by_id(session: AsyncSession, order_id: str) -> OrderOut | None:
    result = await session.execute(select(Order).where(Order.id == order_id))
    row = result.scalar_one_or_none()
    return OrderOut.model_validate(row) if row else None


async def list_orders_by_user(session: AsyncSession, principal_id: str) -> list[OrderOut]:
    result = await session.execute(
        select(Order).where(Order.principal_id == principal_id).order_by(Order.placed_at.desc())
    )
    return [OrderOut.model_validate(row) for row in result.scalars()]


async def list_order_items(session: AsyncSession, order_id: str) -> list[OrderItemOut]:
    result = await session.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    return [OrderItemOut.model_validate(row) for row in result.scalars()]
