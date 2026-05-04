from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.order.schemas import OrderOut, OrderItemOut
from app.modules.order import service

router = APIRouter()


@router.get("/", response_model=list[OrderOut])
async def list_orders(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[OrderOut]:
    return await service.get_user_orders(session, x_user_id)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> OrderOut:
    return await service.fetch_order(session, order_id)


@router.get("/{order_id}/items", response_model=list[OrderItemOut])
async def get_order_items(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[OrderItemOut]:
    return await service.get_order_items(session, order_id)
