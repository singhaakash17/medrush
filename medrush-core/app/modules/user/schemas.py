from pydantic import BaseModel
from datetime import date, datetime
from typing import List


class ProfileOut(BaseModel):
    principal_id: str
    full_name: str
    date_of_birth: date | None
    gender: str | None
    profile_photo_url: str | None
    preferred_language: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AddressOut(BaseModel):
    id: str
    principal_id: str
    label: str
    line1: str
    line2: str | None
    city: str
    state: str
    pincode: str
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class FamilyMemberOut(BaseModel):
    id: str
    principal_id: str
    full_name: str
    relationship: str
    date_of_birth: date | None
    gender: str | None
    is_minor: bool | None
    allergies: List[str] | None

    model_config = {"from_attributes": True}


class RxVaultEntryOut(BaseModel):
    id: str
    principal_id: str
    rx_id: str
    label: str | None
    added_at: datetime
    expires_at: datetime | None

    model_config = {"from_attributes": True}
