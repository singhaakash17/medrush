from sqlalchemy import Column, DateTime, Text
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from app.db.base_model import Base

_SCHEMA = "audit_m"


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    event_name = Column(Text, nullable=False)
    actor_id = Column(Text, nullable=True)
    actor_role = Column(Text, nullable=True)
    actor_ip = Column(INET, nullable=True)
    target_type = Column(Text, nullable=False)
    target_id = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False)
    prev_hash = Column(Text, nullable=True)
    row_hash = Column(Text, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)


class DeletionRequest(Base):
    __tablename__ = "deletion_requests"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    requested_by = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="pending")
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
