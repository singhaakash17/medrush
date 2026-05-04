from pydantic import BaseModel
from datetime import datetime


class PharmacyOut(BaseModel):
    id: str
    name: str
    dl_number: str
    gstin: str | None
    city: str
    state: str
    pincode: str
    phone: str
    status: str
    is_open_now: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PharmacistOut(BaseModel):
    id: str
    pharmacy_id: str
    principal_id: str
    pci_registration_no: str
    is_active: bool
    joined_at: datetime

    model_config = {"from_attributes": True}
