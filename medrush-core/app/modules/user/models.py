from sqlalchemy import Boolean, Column, Computed, Date, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY
from geoalchemy2 import Geography
from app.db.base_model import Base

_SCHEMA = "user_m"


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = {"schema": _SCHEMA}

    principal_id = Column(Text, primary_key=True)
    full_name = Column(Text, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Text, nullable=True)
    profile_photo_url = Column(Text, nullable=True)
    preferred_language = Column(Text, nullable=False, default="en")
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class Address(Base):
    __tablename__ = "addresses"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    label = Column(Text, nullable=False)
    line1 = Column(Text, nullable=False)
    line2 = Column(Text, nullable=True)
    city = Column(Text, nullable=False)
    state = Column(Text, nullable=False)
    pincode = Column(Text, nullable=False)
    geo_point = Column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class FamilyMember(Base):
    __tablename__ = "family_members"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False)
    relationship = Column(Text, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Text, nullable=True)
    is_minor = Column(
        Boolean,
        Computed(
            "date_of_birth IS NOT NULL AND date_of_birth > (CURRENT_DATE - INTERVAL '18 years')",
            persisted=True,
        ),
        nullable=True,
    )
    allergies = Column(ARRAY(Text), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class RxVaultEntry(Base):
    __tablename__ = "rx_vault_entries"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    rx_id = Column(Text, nullable=False)
    label = Column(Text, nullable=True)
    added_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)


class PaymentPreference(Base):
    __tablename__ = "payment_preferences"
    __table_args__ = {"schema": _SCHEMA}

    principal_id = Column(Text, primary_key=True)
    preferred_method = Column(Text, nullable=True)
    saved_vpa = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
