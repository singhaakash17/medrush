from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, Text
from app.db.base_model import Base

_SCHEMA = "cart_m"


class Cart(Base):
    __tablename__ = "carts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    pharmacy_id = Column(Text, nullable=True)
    delivery_address_id = Column(Text, nullable=True)
    state = Column(Text, nullable=False, default="active")
    rx_id = Column(Text, nullable=True)
    coupon_code = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    cart_id = Column(Text, nullable=False)
    medicine_id = Column(Text, nullable=False)
    qty = Column(Integer, nullable=False)
    unit_price_paise = Column(BigInteger, nullable=False)
    added_at = Column(DateTime(timezone=True), nullable=False)


class Coupon(Base):
    __tablename__ = "coupons"
    __table_args__ = {"schema": _SCHEMA}

    code = Column(Text, primary_key=True)
    discount_type = Column(Text, nullable=False)
    discount_value_paise = Column(BigInteger, nullable=True)
    discount_bps = Column(Integer, nullable=True)
    max_discount_paise = Column(BigInteger, nullable=True)
    min_order_paise = Column(BigInteger, nullable=False, default=0)
    per_user_limit = Column(Integer, nullable=True)
    total_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    applies_to = Column(Text, nullable=False, default="all")
    applies_to_id = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    coupon_code = Column(Text, nullable=False)
    principal_id = Column(Text, nullable=False)
    order_id = Column(Text, nullable=False)
    discount_applied_paise = Column(BigInteger, nullable=False)
    redeemed_at = Column(DateTime(timezone=True), nullable=False)


class PricingRule(Base):
    __tablename__ = "pricing_rules"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    rule_type = Column(Text, nullable=False)
    amount_paise = Column(BigInteger, nullable=True)
    amount_bps = Column(Integer, nullable=True)
    city = Column(Text, nullable=True)
    pincode = Column(Text, nullable=True)
    min_order_paise = Column(BigInteger, nullable=True)
    max_amount_paise = Column(BigInteger, nullable=True)
    free_above_paise = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_until = Column(DateTime(timezone=True), nullable=True)
