from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.order.repository import get_order_by_id, list_orders_by_user, list_order_items
from app.modules.order.schemas import OrderOut, OrderItemOut
from app.lib.errors import NotFoundError


async def fetch_order(session: AsyncSession, order_id: str) -> OrderOut:
    order = await get_order_by_id(session, order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")
    return order


async def get_user_orders(session: AsyncSession, principal_id: str) -> list[OrderOut]:
    return await list_orders_by_user(session, principal_id)


async def get_order_items(session: AsyncSession, order_id: str) -> list[OrderItemOut]:
    return await list_order_items(session, order_id)
