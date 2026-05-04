from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.payment.repository import (
    get_payment_by_order, get_payment_by_id, list_refunds_by_order,
    list_payouts_by_pharmacy, list_bank_accounts,
)
from app.modules.payment.schemas import PaymentOut, RefundOut, PharmacyPayoutOut, BankAccountOut
from app.lib.errors import NotFoundError


async def get_order_payment(session: AsyncSession, order_id: str) -> PaymentOut:
    payment = await get_payment_by_order(session, order_id)
    if not payment:
        raise NotFoundError(f"Payment for order {order_id} not found")
    return payment


async def fetch_payment(session: AsyncSession, payment_id: str) -> PaymentOut:
    payment = await get_payment_by_id(session, payment_id)
    if not payment:
        raise NotFoundError(f"Payment {payment_id} not found")
    return payment


async def get_order_refunds(session: AsyncSession, order_id: str) -> list[RefundOut]:
    return await list_refunds_by_order(session, order_id)


async def get_pharmacy_payouts(session: AsyncSession, pharmacy_id: str) -> list[PharmacyPayoutOut]:
    return await list_payouts_by_pharmacy(session, pharmacy_id)


async def get_bank_accounts(session: AsyncSession, owner_type: str, owner_id: str) -> list[BankAccountOut]:
    return await list_bank_accounts(session, owner_type, owner_id)
