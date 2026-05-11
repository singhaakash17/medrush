"""
Payment service – Razorpay integration (with COD / mock fallback).

Flow for online payments:
  1. POST /payments/orders/{order_id}/initiate
     → creates Razorpay order, stores in DB, returns rzp_order_id + key_id
  2. Frontend renders Razorpay checkout
  3. POST /payments/orders/{order_id}/verify
     → verifies HMAC signature, marks payment captured

COD flow: payment record created with status=cod_pending; captured on delivery.
"""
import hashlib
import hmac
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.payment.repository import (
    get_payment_by_order, get_payment_by_id, list_refunds_by_order,
    list_payouts_by_pharmacy, list_bank_accounts, create_payment, update_payment,
)
from app.modules.payment.models import Payment
from app.modules.payment.schemas import (
    PaymentOut, RefundOut, PharmacyPayoutOut, BankAccountOut,
    InitiatePaymentOut, VerifyPaymentIn,
)
from app.modules.order.repository import get_order_by_id, update_order_status
from app.kafka.events import publish_event
from app.lib.errors import NotFoundError, AppValidationError
from app.settings import settings


async def initiate_payment(
    session: AsyncSession, order_id: str, principal_id: str, method: str
) -> "InitiatePaymentOut":
    order = await get_order_by_id(session, order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")

    now = datetime.now(timezone.utc)
    payment_id = str(uuid.uuid4())

    if method == "cod":
        payment = Payment(
            id=payment_id,
            order_id=order_id,
            principal_id=principal_id,
            provider="cod",
            amount_paise=order.total_paise,
            currency="INR",
            fee_paise=0,
            tax_on_fee_paise=0,
            method="cod",
            status="cod_pending",
            initiated_at=now,
            created_at=now,
            updated_at=now,
        )
        await create_payment(session, payment)
        await session.commit()
        return InitiatePaymentOut(
            payment_id=payment_id,
            method="cod",
            rzp_order_id=None,
            rzp_key_id=None,
            amount_paise=order.total_paise,
        )

    # Razorpay – create order via API (stub if not configured)
    rzp_order_id: str | None = None
    if settings.ENABLE_PAYMENT_GATEWAY:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),  # type: ignore[attr-defined]
                json={
                    "amount": order.total_paise,
                    "currency": "INR",
                    "receipt": order.short_code,
                },
                timeout=10,
            )
            resp.raise_for_status()
            rzp_order_id = resp.json()["id"]
    else:
        rzp_order_id = f"order_stub_{uuid.uuid4().hex[:12]}"

    payment = Payment(
        id=payment_id,
        order_id=order_id,
        principal_id=principal_id,
        provider="razorpay",
        provider_order_id=rzp_order_id,
        amount_paise=order.total_paise,
        currency="INR",
        fee_paise=0,
        tax_on_fee_paise=0,
        method=method,
        status="initiated",
        initiated_at=now,
        created_at=now,
        updated_at=now,
    )
    await create_payment(session, payment)
    await session.commit()

    return InitiatePaymentOut(
        payment_id=payment_id,
        method=method,
        rzp_order_id=rzp_order_id,
        rzp_key_id=getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_stub"),
        amount_paise=order.total_paise,
    )


async def verify_payment(
    session: AsyncSession, order_id: str, payload: "VerifyPaymentIn"
) -> PaymentOut:
    payment = await get_payment_by_order(session, order_id)
    if not payment:
        raise NotFoundError("Payment not found for this order")

    if settings.ENABLE_PAYMENT_GATEWAY:
        # Verify Razorpay HMAC signature
        expected = hmac.new(
            getattr(settings, "RAZORPAY_KEY_SECRET", "").encode(),
            f"{payment.provider_order_id}|{payload.rzp_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, payload.rzp_signature):
            raise AppValidationError("Payment signature verification failed")

    now = datetime.now(timezone.utc)
    await update_payment(
        session, payment.id,
        status="captured",
        provider_payment_id=payload.rzp_payment_id,
        authorised_at=now,
        captured_at=now,
    )
    await session.commit()

    await publish_event("payment.captured", {
        "order_id": order_id,
        "payment_id": payment.id,
        "amount_paise": payment.amount_paise,
    })

    return await get_payment_by_id(session, payment.id)


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
