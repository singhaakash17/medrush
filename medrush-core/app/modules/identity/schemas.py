from pydantic import BaseModel, field_validator
from datetime import datetime
import re


class OtpSendIn(BaseModel):
    phone_e164: str

    @field_validator("phone_e164")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+[1-9]\d{6,14}$", v):
            raise ValueError("Invalid phone number — must be E.164 format e.g. +919876543210")
        return v


class OtpVerifyIn(BaseModel):
    phone_e164: str
    otp: str


class OtpVerifyOut(BaseModel):
    principal_id: str
    phone_e164: str
    role: str


class PrincipalOut(BaseModel):
    id: str
    phone_e164: str
    email: str | None
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RoleAssignmentOut(BaseModel):
    id: str
    principal_id: str
    role: str
    resource_type: str | None
    resource_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
