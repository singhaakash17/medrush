from pydantic import BaseModel
from datetime import datetime


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
