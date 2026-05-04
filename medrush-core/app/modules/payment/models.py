from sqlalchemy import BigInteger, Boolean, Column, Computed, Date, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_model import Base

_SCHEMA = "payment_m"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    order_id = Column(Text, nullable=False)
    principal_id = Column(Text, nullable=False)
    provider = Column(Text, nullable=False)
    provider_payment_id = Column(Text, nullable=True)
    provider_order_id = Column(Text, nullable=True)
    amount_paise = Column(BigInteger, nullable=False)
    currency = Column(Text, nullable=False, default="INR")
    fee_paise = Column(BigInteger, nullable=False, default=0)
    tax_on_fee_paise = Column(BigInteger, nullable=False, default=0)
    net_paise = Column(
        BigInteger,
        Computed("amount_paise - fee_paise - tax_on_fee_paise", persisted=True),
        nullable=True,
    )
    method = Column(Text, nullable=False)
    method_detail = Column(JSONB, nullable=True)
    status = Column(Text, nullable=False)
    failure_code = Column(Text, nullable=True)
    failure_message = Column(Text, nullable=True)
    idempotency_key = Column(Text, nullable=False)
    initiated_at = Column(DateTime(timezone=True), nullable=False)
    authorised_at = Column(DateTime(timezone=True), nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    payment_id = Column(Text, nullable=False)
    attempt_no = Column(Integer, nullable=False)
    status = Column(Text, nullable=False)
    request_payload = Column(JSONB, nullable=True)
    response_payload = Column(JSONB, nullable=True)
    http_status = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Refund(Base):
    __tablename__ = "refunds"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    payment_id = Column(Text, nullable=False)
    order_id = Column(Text, nullable=False)
    amount_paise = Column(BigInteger, nullable=False)
    reason = Column(Text, nullable=False)
    provider_refund_id = Column(Text, nullable=True)
    status = Column(Text, nullable=False)
    speed = Column(Text, nullable=False, default="normal")
    initiated_by = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    initiated_at = Column(DateTime(timezone=True), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    provider = Column(Text, nullable=False)
    event_type = Column(Text, nullable=False)
    signature_valid = Column(Boolean, nullable=False)
    payload = Column(JSONB, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    processing_error = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False)


class PharmacyPayout(Base):
    __tablename__ = "pharmacy_payouts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    pharmacy_id = Column(Text, nullable=False)
    cycle_start = Column(Date, nullable=False)
    cycle_end = Column(Date, nullable=False)
    gross_paise = Column(BigInteger, nullable=False)
    commission_paise = Column(BigInteger, nullable=False)
    adjustments_paise = Column(BigInteger, nullable=False, default=0)
    net_paise = Column(BigInteger, nullable=False)
    status = Column(Text, nullable=False)
    utr_number = Column(Text, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class BankAccount(Base):
    __tablename__ = "bank_accounts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    owner_type = Column(Text, nullable=False)
    owner_id = Column(Text, nullable=False)
    account_holder_name = Column(Text, nullable=False)
    account_number_masked = Column(Text, nullable=False)
    account_number_token = Column(Text, nullable=False)
    ifsc = Column(Text, nullable=False)
    bank_name = Column(Text, nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_primary = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
