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


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
