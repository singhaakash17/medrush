from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_model import Base

_SCHEMA = "order_m"


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    short_code = Column(Text, nullable=False, unique=True)
    principal_id = Column(Text, nullable=False)
    pharmacy_id = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="pending")
    delivery_address = Column(JSONB, nullable=False)
    rx_id = Column(Text, nullable=True)
    coupon_code = Column(Text, nullable=True)
    subtotal_paise = Column(BigInteger, nullable=False)
    discount_paise = Column(BigInteger, nullable=False, default=0)
    delivery_fee_paise = Column(BigInteger, nullable=False, default=0)
    platform_fee_paise = Column(BigInteger, nullable=False, default=0)
    tax_paise = Column(BigInteger, nullable=False, default=0)
    total_paise = Column(BigInteger, nullable=False)
    sla_target_at = Column(DateTime(timezone=True), nullable=False)
    placed_at = Column(DateTime(timezone=True), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    order_id = Column(Text, nullable=False)
    medicine_id = Column(Text, nullable=False)
    medicine_name = Column(Text, nullable=False)
    qty = Column(Integer, nullable=False)
    unit_price_paise = Column(BigInteger, nullable=False)
    total_paise = Column(BigInteger, nullable=False)
    is_rx_item = Column(Boolean, nullable=False, default=False)


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(Text, nullable=False)
    from_status = Column(Text, nullable=True)
    to_status = Column(Text, nullable=False)
    actor_id = Column(Text, nullable=True)
    metadata = Column(JSONB, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False)


class SagaState(Base):
    __tablename__ = "saga_states"
    __table_args__ = {"schema": _SCHEMA}

    order_id = Column(Text, primary_key=True)
    step = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    context = Column(JSONB, nullable=False, default={})
    retry_count = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class OrderRating(Base):
    __tablename__ = "order_ratings"
    __table_args__ = {"schema": _SCHEMA}

    order_id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    pharmacy_rating = Column(Integer, nullable=True)
    delivery_rating = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    rated_at = Column(DateTime(timezone=True), nullable=False)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = {"schema": _SCHEMA}

    key = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(JSONB, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
