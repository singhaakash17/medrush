from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.order.schemas import (
    OrderOut, OrderWithItemsOut, OrderItemOut, OrderStatusHistoryOut,
    PlaceOrderIn, UpdateOrderStatusIn, RateOrderIn,
)
from app.modules.order import service

router = APIRouter()


@router.post("/", response_model=OrderOut, status_code=201)
async def place_order(
    payload: PlaceOrderIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> OrderOut:
    return await service.place_order(session, x_user_id, payload)


@router.get("/", response_model=list[OrderOut])
async def list_my_orders(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> list[OrderOut]:
    return await service.get_user_orders(session, x_user_id)


@router.get("/pharmacy/{pharmacy_id}", response_model=list[OrderWithItemsOut])
async def list_pharmacy_orders(
    pharmacy_id: str,
    statuses: str | None = Query(None, description="Comma-separated statuses, e.g. pending,confirmed"),
    session: AsyncSession = Depends(get_async_session),
) -> list[OrderWithItemsOut]:
    status_list = [s.strip() for s in statuses.split(",")] if statuses else None
    return await service.get_pharmacy_orders(session, pharmacy_id, status_list)


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


@router.get("/{order_id}/history", response_model=list[OrderStatusHistoryOut])
async def get_order_history(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[OrderStatusHistoryOut]:
    return await service.get_status_history(session, order_id)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_status(
    order_id: str,
    payload: UpdateOrderStatusIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> OrderOut:
    return await service.transition_status(session, order_id, x_user_id, payload)


@router.post("/{order_id}/rate", status_code=204)
async def rate_order(
    order_id: str,
    payload: RateOrderIn,
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    await service.rate_order(session, order_id, x_user_id, payload)
