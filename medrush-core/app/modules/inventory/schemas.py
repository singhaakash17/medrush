from pydantic import BaseModel
from datetime import date, datetime
from typing import Literal


class InventoryItemOut(BaseModel):
    pharmacy_id: str
    medicine_id: str
    qty_on_hand: int
    qty_reserved: int
    qty_available: int | None
    reorder_level: int
    selling_price_paise: int
    mrp_paise: int
    discount_bps: int | None
    current_batch_no: str | None
    current_expiry: date | None
    source: str
    last_synced_at: datetime
    is_listed: bool
    unlisted_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryBatchOut(BaseModel):
    id: str
    pharmacy_id: str
    medicine_id: str
    batch_no: str
    manufacture_date: date | None
    expiry_date: date
    qty_received: int
    qty_remaining: int
    received_at: datetime

    model_config = {"from_attributes": True}


class ReservationOut(BaseModel):
    id: str
    pharmacy_id: str
    medicine_id: str
    order_id: str
    qty: int
    state: Literal["soft", "hard", "committed", "released", "expired"]
    expires_at: datetime
    created_at: datetime
    state_changed_at: datetime

    model_config = {"from_attributes": True}


class InventoryLedgerOut(BaseModel):
    id: int
    pharmacy_id: str
    medicine_id: str
    delta_qty: int
    reason: str
    reference_id: str | None
    qty_after: int
    actor_id: str | None
    notes: str | None
    occurred_at: datetime

    model_config = {"from_attributes": True}
