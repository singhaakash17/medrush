from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.deps import get_async_session
from app.modules.payment.schemas import PaymentOut, RefundOut, PharmacyPayoutOut, BankAccountOut
from app.modules.payment import service

router = APIRouter()


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> PaymentOut:
    return await service.fetch_payment(session, payment_id)


@router.get("/orders/{order_id}", response_model=PaymentOut)
async def get_order_payment(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> PaymentOut:
    return await service.get_order_payment(session, order_id)


@router.get("/orders/{order_id}/refunds", response_model=list[RefundOut])
async def list_order_refunds(
    order_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[RefundOut]:
    return await service.get_order_refunds(session, order_id)


@router.get("/payouts/pharmacies/{pharmacy_id}", response_model=list[PharmacyPayoutOut])
async def list_pharmacy_payouts(
    pharmacy_id: str,
    session: AsyncSession = Depends(get_async_session),
) -> list[PharmacyPayoutOut]:
    return await service.get_pharmacy_payouts(session, pharmacy_id)


@router.get("/bank-accounts", response_model=list[BankAccountOut])
async def list_bank_accounts(
    owner_type: str = Query(..., pattern="^(pharmacy|rider)$"),
    owner_id: str = Query(...),
    session: AsyncSession = Depends(get_async_session),
) -> list[BankAccountOut]:
    return await service.get_bank_accounts(session, owner_type, owner_id)
