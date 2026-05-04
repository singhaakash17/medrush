from sqlalchemy import BigInteger, Boolean, Column, DateTime, Text
from sqlalchemy.dialects.postgresql import INET
from app.db.base_model import Base

_SCHEMA = "identity_m"


class Principal(Base):
    __tablename__ = "principals"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    phone_e164 = Column(Text, nullable=False, unique=True)
    email = Column(Text, nullable=True, unique=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class OtpAttempt(Base):
    __tablename__ = "otp_attempts"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    principal_id = Column(Text, nullable=False)
    otp_hash = Column(Text, nullable=False)
    ip_address = Column(INET, nullable=True)
    channel = Column(Text, nullable=False, default="sms")
    is_used = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    token_hash = Column(Text, nullable=False, unique=True)
    device_fingerprint = Column(Text, nullable=True)
    is_revoked = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class RoleAssignment(Base):
    __tablename__ = "role_assignments"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    role = Column(Text, nullable=False)
    resource_type = Column(Text, nullable=True)
    resource_id = Column(Text, nullable=True)
    granted_by = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
