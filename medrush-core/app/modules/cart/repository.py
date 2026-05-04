from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.cart.models import Cart, CartItem, Coupon
from app.modules.cart.schemas import CartOut, CartItemOut, CouponOut


async def get_active_cart_by_principal(session: AsyncSession, principal_id: str) -> CartOut | None:
    result = await session.execute(
        select(Cart).where(Cart.principal_id == principal_id, Cart.state == "active")
    )
    row = result.scalar_one_or_none()
    return CartOut.model_validate(row) if row else None


async def list_cart_items(session: AsyncSession, cart_id: str) -> list[CartItemOut]:
    result = await session.execute(select(CartItem).where(CartItem.cart_id == cart_id))
    return [CartItemOut.model_validate(row) for row in result.scalars()]


async def get_coupon(session: AsyncSession, code: str) -> CouponOut | None:
    result = await session.execute(
        select(Coupon).where(Coupon.code == code, Coupon.is_active == True)  # noqa: E712
    )
    row = result.scalar_one_or_none()
    return CouponOut.model_validate(row) if row else None
