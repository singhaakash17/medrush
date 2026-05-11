from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class RiderOut(BaseModel):
    id: str
    principal_id: str
    full_name: str
    phone_e164: str
    vehicle_type: str
    vehicle_number: str
    status: str
    rating: Decimal | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RiderStatusIn(BaseModel):
    status: str  # online, offline, on_delivery


class AssignmentOut(BaseModel):
    id: str
    order_id: str
    rider_id: str
    status: str
    distance_m: int | None
    eta_seconds: int | None
    assigned_at: datetime
    picked_up_at: datetime | None
    delivered_at: datetime | None
    failed_at: datetime | None
    failure_reason: str | None

    model_config = {"from_attributes": True}


class AssignRiderIn(BaseModel):
    rider_id: str
    pickup_lat: float
    pickup_lon: float
    drop_lat: float
    drop_lon: float
    distance_m: int | None = None
    eta_seconds: int | None = None


class LocationPingIn(BaseModel):
    lat: float
    lon: float
    accuracy_m: int | None = None
    assignment_id: str | None = None


class VerifyOtpIn(BaseModel):
    otp: str


class RiderShiftOut(BaseModel):
    id: str
    rider_id: str
    started_at: datetime
    ended_at: datetime | None
    orders_completed: int
    earnings_paise: int

    model_config = {"from_attributes": True}
