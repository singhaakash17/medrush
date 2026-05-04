from pydantic import BaseModel
from datetime import datetime


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
