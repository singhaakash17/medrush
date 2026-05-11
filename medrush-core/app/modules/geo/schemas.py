import math
from pydantic import BaseModel
from datetime import datetime


class PharmacyLocationOut(BaseModel):
    pharmacy_id: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServiceAreaOut(BaseModel):
    id: str
    name: str
    city: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NearbyPharmacyOut(BaseModel):
    pharmacy_id: str
    name: str
    address_line1: str
    city: str
    phone: str
    is_open_now: bool
    distance_m: int
    eta_minutes: int
    lat: float
    lon: float
    # Per-medicine stock when queried with medicine_id
    medicine_id: str | None = None
    qty_available: int | None = None
    selling_price_paise: int | None = None
    mrp_paise: int | None = None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
