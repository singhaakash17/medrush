from fastapi import APIRouter, Depends, Header, Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.cart.schemas import CartOut, CartItemOut, CouponOut
from app.modules.cart import service

router = APIRouter()


@router.get("/", response_model=CartOut | None)
async def get_cart(
    x_user_id: str = Header(..., alias="x-user-id"),
    session: AsyncSession = Depends(get_async_session),
) -> CartOut | None:
    return await service.get_user_cart(session, x_user_id)


@router.get("/{cart_id}/items", response_model=list[CartItemOut])
async def get_cart_items(
    cart_id: str = Path(...),
    session: AsyncSession = Depends(get_async_session),
) -> list[CartItemOut]:
    return await service.get_cart_items(session, cart_id)


@router.get("/coupons/{code}", response_model=CouponOut)
async def get_coupon(
    code: str = Path(...),
    session: AsyncSession = Depends(get_async_session),
) -> CouponOut:
    return await service.fetch_coupon(session, code)
