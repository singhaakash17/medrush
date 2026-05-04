from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.cart.repository import get_active_cart_by_principal, list_cart_items, get_coupon
from app.modules.cart.schemas import CartOut, CartItemOut, CouponOut
from app.lib.errors import NotFoundError


async def get_user_cart(session: AsyncSession, principal_id: str) -> CartOut | None:
    return await get_active_cart_by_principal(session, principal_id)


async def get_cart_items(session: AsyncSession, cart_id: str) -> list[CartItemOut]:
    return await list_cart_items(session, cart_id)


async def fetch_coupon(session: AsyncSession, code: str) -> CouponOut:
    coupon = await get_coupon(session, code)
    if not coupon:
        raise NotFoundError(f"Coupon {code} not found or inactive")
    return coupon
