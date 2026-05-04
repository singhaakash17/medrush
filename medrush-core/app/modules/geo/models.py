from sqlalchemy import Boolean, Column, DateTime, Integer, Text
from geoalchemy2 import Geography
from app.db.base_model import Base

_SCHEMA = "geo_m"


class PharmacyLocation(Base):
    __tablename__ = "pharmacy_locations"
    __table_args__ = {"schema": _SCHEMA}

    pharmacy_id = Column(Text, primary_key=True)
    geo_point = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class EtaCache(Base):
    __tablename__ = "eta_cache"
    __table_args__ = {"schema": _SCHEMA}

    origin_geohash6 = Column(Text, primary_key=True)
    dest_geohash6 = Column(Text, primary_key=True)
    travel_mode = Column(Text, primary_key=True)
    time_bucket = Column(Integer, primary_key=True)
    eta_seconds = Column(Integer, nullable=False)
    distance_m = Column(Integer, nullable=False)
    cached_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class ServiceArea(Base):
    __tablename__ = "service_areas"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    polygon = Column(Geography(geometry_type="POLYGON", srid=4326), nullable=False)
    city = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
