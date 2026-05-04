import uuid
from pydantic import BaseModel
from datetime import datetime


class AuditLogOut(BaseModel):
    id: uuid.UUID
    event_name: str
    actor_id: str | None
    actor_role: str | None
    target_type: str
    target_id: str
    payload: dict
    row_hash: str
    occurred_at: datetime

    model_config = {"from_attributes": True}
