from sqlalchemy import Boolean, Column, DateTime, Integer, Text
from geoalchemy2 import Geography
from app.db.base_model import Base

_SCHEMA = "pharmacy_m"


class Pharmacy(Base):
    __tablename__ = "pharmacies"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    dl_number = Column(Text, nullable=False, unique=True)
    gstin = Column(Text, nullable=True)
    owner_principal_id = Column(Text, nullable=False)
    address_line1 = Column(Text, nullable=False)
    address_line2 = Column(Text, nullable=True)
    city = Column(Text, nullable=False)
    state = Column(Text, nullable=False)
    pincode = Column(Text, nullable=False)
    geo_point = Column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    phone = Column(Text, nullable=False)
    email = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="pending")
    is_open_now = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class PharmacyDocument(Base):
    __tablename__ = "pharmacy_documents"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    pharmacy_id = Column(Text, nullable=False)
    doc_type = Column(Text, nullable=False)
    s3_key = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="pending")
    verified_by = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=False)


class Pharmacist(Base):
    __tablename__ = "pharmacists"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    pharmacy_id = Column(Text, nullable=False)
    principal_id = Column(Text, nullable=False)
    pci_registration_no = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    joined_at = Column(DateTime(timezone=True), nullable=False)


class OperatingSchedule(Base):
    __tablename__ = "operating_schedules"
    __table_args__ = {"schema": _SCHEMA}

    pharmacy_id = Column(Text, primary_key=True)
    day_of_week = Column(Integer, primary_key=True)
    open_time = Column(Text, nullable=False)
    close_time = Column(Text, nullable=False)
    is_closed = Column(Boolean, nullable=False, default=False)


class PharmacyHoliday(Base):
    __tablename__ = "pharmacy_holidays"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    pharmacy_id = Column(Text, nullable=False)
    holiday_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text, nullable=True)


class PharmacySetting(Base):
    __tablename__ = "pharmacy_settings"
    __table_args__ = {"schema": _SCHEMA}

    pharmacy_id = Column(Text, primary_key=True)
    key = Column(Text, primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
