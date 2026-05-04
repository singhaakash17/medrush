from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class MedicineOut(BaseModel):
    id: str
    brand_name: str
    generic_name: str
    form: str
    strength: str | None
    pack_size: int
    pack_unit: str
    mrp_paise: int
    gst_rate_bps: int
    schedule: Literal["OTC", "G", "H", "H1", "X", "GENERAL"] | None
    rx_required: bool
    is_discontinued: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SaltOut(BaseModel):
    id: str
    name: str
    who_essential: bool

    model_config = {"from_attributes": True}


class ManufacturerOut(BaseModel):
    id: str
    name: str
    country: str | None

    model_config = {"from_attributes": True}


class MedicineWarningOut(BaseModel):
    id: str
    medicine_id: str
    warning_type: str
    description: str
    severity: str

    model_config = {"from_attributes": True}
