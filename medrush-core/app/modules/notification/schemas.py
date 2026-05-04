from pydantic import BaseModel
from datetime import datetime


class DeliveryLogOut(BaseModel):
    id: str
    template_id: str | None
    recipient_principal_id: str
    channel: str
    destination: str
    subject: str | None
    status: str
    provider: str | None
    retry_count: int
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeviceTokenOut(BaseModel):
    id: str
    principal_id: str
    platform: str
    is_active: bool
    registered_at: datetime

    model_config = {"from_attributes": True}
