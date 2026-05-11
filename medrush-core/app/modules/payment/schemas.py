from pydantic import BaseModel
from datetime import date, datetime
from typing import Literal


class InitiatePaymentIn(BaseModel):
    method: Literal["upi", "card", "cod", "wallet"] = "cod"


class InitiatePaymentOut(BaseModel):
    payment_id: str
    method: str
    rzp_order_id: str | None
    rzp_key_id: str | None
    amount_paise: int


class VerifyPaymentIn(BaseModel):
    rzp_payment_id: str
    rzp_signature: str


class PaymentOut(BaseModel):
    id: str
    order_id: str
    principal_id: str
    provider: str
    provider_payment_id: str | None
    provider_order_id: str | None
    amount_paise: int
    currency: str
    fee_paise: int
    tax_on_fee_paise: int
    net_paise: int | None
    method: str
    method_detail: dict | None
    status: str
    failure_code: str | None
    failure_message: str | None
    initiated_at: datetime
    authorised_at: datetime | None
    captured_at: datetime | None
    failed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RefundOut(BaseModel):
    id: str
    payment_id: str
    order_id: str
    amount_paise: int
    reason: str
    provider_refund_id: str | None
    status: Literal["initiated", "processed", "failed"]
    speed: str
    initiated_by: str
    notes: str | None
    initiated_at: datetime
    processed_at: datetime | None

    model_config = {"from_attributes": True}


class PharmacyPayoutOut(BaseModel):
    id: str
    pharmacy_id: str
    cycle_start: date
    cycle_end: date
    gross_paise: int
    commission_paise: int
    adjustments_paise: int
    net_paise: int
    status: Literal["pending", "processing", "paid", "failed", "on_hold"]
    utr_number: str | None
    paid_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BankAccountOut(BaseModel):
    id: str
    owner_type: Literal["pharmacy", "rider"]
    owner_id: str
    account_holder_name: str
    account_number_masked: str
    ifsc: str
    bank_name: str | None
    is_verified: bool
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}
