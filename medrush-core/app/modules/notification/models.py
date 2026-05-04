from sqlalchemy import Boolean, Column, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_model import Base

_SCHEMA = "notification_m"


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False, unique=True)
    channel = Column(Text, nullable=False)
    subject = Column(Text, nullable=True)
    body_template = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class DeliveryLog(Base):
    __tablename__ = "delivery_log"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    template_id = Column(Text, nullable=True)
    recipient_principal_id = Column(Text, nullable=False)
    channel = Column(Text, nullable=False)
    destination = Column(Text, nullable=False)
    subject = Column(Text, nullable=True)
    body = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="pending")
    provider = Column(Text, nullable=True)
    provider_message_id = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class UserPreference(Base):
    __tablename__ = "user_preferences"
    __table_args__ = {"schema": _SCHEMA}

    principal_id = Column(Text, primary_key=True)
    channel = Column(Text, primary_key=True)
    enabled = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    token = Column(Text, nullable=False, unique=True)
    platform = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    registered_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
