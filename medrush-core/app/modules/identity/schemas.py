from pydantic import BaseModel
from datetime import datetime


class OtpSendRequest(BaseModel):
    phone_e164: str  # e.g. "+919876543210"


class OtpSendResponse(BaseModel):
    message: str


class OtpVerifyRequest(BaseModel):
    phone_e164: str
    otp: str


class OtpVerifyResponse(BaseModel):
    principal_id: str
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
