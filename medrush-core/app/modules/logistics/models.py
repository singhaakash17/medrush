from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, Numeric, Text
from geoalchemy2 import Geography
from app.db.base_model import Base

_SCHEMA = "logistics_m"


class Rider(Base):
    __tablename__ = "riders"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False)
    phone_e164 = Column(Text, nullable=False)
    vehicle_type = Column(Text, nullable=False)
    vehicle_number = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="offline")
    rating = Column(Numeric(3, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class RiderShift(Base):
    __tablename__ = "rider_shifts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    rider_id = Column(Text, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    orders_completed = Column(Integer, nullable=False, default=0)
    earnings_paise = Column(BigInteger, nullable=False, default=0)


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    order_id = Column(Text, nullable=False, unique=True)
    rider_id = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="assigned")
    pickup_geo = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    drop_geo = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    distance_m = Column(Integer, nullable=True)
    eta_seconds = Column(Integer, nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=False)
    picked_up_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)


class RiderLocationPing(Base):
    __tablename__ = "rider_location_pings"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    rider_id = Column(Text, nullable=False)
    assignment_id = Column(Text, nullable=True)
    geo_point = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    accuracy_m = Column(Integer, nullable=True)
    pinged_at = Column(DateTime(timezone=True), nullable=False)
