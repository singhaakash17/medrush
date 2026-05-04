from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class CartItemOut(BaseModel):
    id: str
    cart_id: str
    medicine_id: str
    qty: int
    unit_price_paise: int
    added_at: datetime

    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    id: str
    principal_id: str
    pharmacy_id: str | None
    delivery_address_id: str | None
    state: Literal["active", "checked_out", "abandoned", "converted"]
    rx_id: str | None
    coupon_code: str | None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class CouponOut(BaseModel):
    code: str
    discount_type: Literal["flat", "percent", "free_delivery"]
    discount_value_paise: int | None
    discount_bps: int | None
    max_discount_paise: int | None
    min_order_paise: int
    per_user_limit: int | None
    total_limit: int | None
    used_count: int
    valid_from: datetime
    valid_until: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class CouponRedemptionOut(BaseModel):
    id: str
    coupon_code: str
    principal_id: str
    order_id: str
    discount_applied_paise: int
    redeemed_at: datetime

    model_config = {"from_attributes": True}
