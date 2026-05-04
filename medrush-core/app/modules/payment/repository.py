from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.payment.models import Payment, Refund, PharmacyPayout, BankAccount
from app.modules.payment.schemas import PaymentOut, RefundOut, PharmacyPayoutOut, BankAccountOut


async def get_payment_by_order(session: AsyncSession, order_id: str) -> PaymentOut | None:
    result = await session.execute(
        select(Payment).where(Payment.order_id == order_id).order_by(Payment.created_at.desc())
    )
    row = result.scalars().first()
    return PaymentOut.model_validate(row) if row else None


async def get_payment_by_id(session: AsyncSession, payment_id: str) -> PaymentOut | None:
    result = await session.execute(select(Payment).where(Payment.id == payment_id))
    row = result.scalar_one_or_none()
    return PaymentOut.model_validate(row) if row else None


async def list_refunds_by_order(session: AsyncSession, order_id: str) -> list[RefundOut]:
    result = await session.execute(
        select(Refund).where(Refund.order_id == order_id).order_by(Refund.initiated_at.desc())
    )
    return [RefundOut.model_validate(row) for row in result.scalars()]


async def list_payouts_by_pharmacy(session: AsyncSession, pharmacy_id: str) -> list[PharmacyPayoutOut]:
    result = await session.execute(
        select(PharmacyPayout).where(PharmacyPayout.pharmacy_id == pharmacy_id).order_by(PharmacyPayout.cycle_start.desc())
    )
    return [PharmacyPayoutOut.model_validate(row) for row in result.scalars()]


async def list_bank_accounts(session: AsyncSession, owner_type: str, owner_id: str) -> list[BankAccountOut]:
    result = await session.execute(
        select(BankAccount).where(BankAccount.owner_type == owner_type, BankAccount.owner_id == owner_id)
    )
    return [BankAccountOut.model_validate(row) for row in result.scalars()]
