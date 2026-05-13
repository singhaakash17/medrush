from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Literal


class OrderItemIn(BaseModel):
    medicine_id: str
    qty: int

    @field_validator("qty")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("qty must be at least 1")
        return v


class DeliveryAddressIn(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    state: str
    pincode: str
    lat: float | None = None
    lon: float | None = None


class PlaceOrderIn(BaseModel):
    pharmacy_id: str
    items: list[OrderItemIn]
    delivery_address: DeliveryAddressIn
    rx_id: str | None = None
    coupon_code: str | None = None
    payment_method: Literal["upi", "card", "cod", "wallet"] = "cod"


class UpdateOrderStatusIn(BaseModel):
    status: Literal["confirmed", "packed", "dispatched", "delivered", "cancelled"]
    reason: str | None = None


class RateOrderIn(BaseModel):
    pharmacy_rating: int | None = None
    delivery_rating: int | None = None
    comment: str | None = None


class OrderItemOut(BaseModel):
    id: str
    order_id: str
    medicine_id: str
    medicine_name: str
    qty: int
    unit_price_paise: int
    total_paise: int
    is_rx_item: bool

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: str
    short_code: str
    principal_id: str
    pharmacy_id: str
    status: str
    delivery_address: dict
    subtotal_paise: int
    discount_paise: int
    delivery_fee_paise: int
    platform_fee_paise: int
    tax_paise: int
    total_paise: int
    sla_target_at: datetime
    placed_at: datetime
    confirmed_at: datetime | None
    dispatched_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None
    cancellation_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderWithItemsOut(OrderOut):
    """OrderOut extended with embedded line items — used for pharmacy order list."""
    items: list[OrderItemOut] = []


class OrderStatusHistoryOut(BaseModel):
    id: int
    order_id: str
    from_status: str | None
    to_status: str
    actor_id: str | None
    occurred_at: datetime

    model_config = {"from_attributes": True}
