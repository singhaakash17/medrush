from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, Numeric, Text
from sqlalchemy.sql import func
from app.db.base_model import Base

_SCHEMA = "catalog_m"


class Salt(Base):
    __tablename__ = "salts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False, unique=True)
    who_essential = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Manufacturer(Base):
    __tablename__ = "manufacturers"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False, unique=True)
    country = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    brand_name = Column(Text, nullable=False)
    generic_name = Column(Text, nullable=False)
    manufacturer_id = Column(Text, nullable=True)
    form = Column(Text, nullable=False)
    strength = Column(Text, nullable=True)
    pack_size = Column(Integer, nullable=False, default=1)
    pack_unit = Column(Text, nullable=False, default="strip")
    mrp_paise = Column(BigInteger, nullable=False)
    gst_rate_bps = Column(Integer, nullable=False, default=500)
    schedule = Column(Text, nullable=True)
    rx_required = Column(Boolean, nullable=False, default=False)
    is_discontinued = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    hsn_code = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class MedicineSalt(Base):
    __tablename__ = "medicine_salts"
    __table_args__ = {"schema": _SCHEMA}

    medicine_id = Column(Text, primary_key=True)
    salt_id = Column(Text, primary_key=True)
    strength_mg = Column(Numeric(10, 3), nullable=True)


class SubstituteGroup(Base):
    __tablename__ = "substitute_groups"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SubstituteMember(Base):
    __tablename__ = "substitute_members"
    __table_args__ = {"schema": _SCHEMA}

    group_id = Column(Text, primary_key=True)
    medicine_id = Column(Text, primary_key=True)
    rank = Column(Integer, nullable=False, default=0)


class MedicineWarning(Base):
    __tablename__ = "medicine_warnings"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    medicine_id = Column(Text, nullable=False)
    warning_type = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Text, nullable=False, default="info")
