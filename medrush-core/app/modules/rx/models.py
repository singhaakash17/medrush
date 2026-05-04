from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, Numeric, Text
from app.db.base_model import Base

_SCHEMA = "rx_m"


class Prescription(Base):
    __tablename__ = "prescriptions"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    principal_id = Column(Text, nullable=False)
    family_member_id = Column(Text, nullable=True)
    doctor_name = Column(Text, nullable=True)
    doctor_registration_no = Column(Text, nullable=True)
    hospital_name = Column(Text, nullable=True)
    prescribed_at = Column(DateTime(timezone=True), nullable=True)
    s3_key = Column(Text, nullable=False)
    ocr_status = Column(Text, nullable=False, default="pending")
    ocr_confidence_bps = Column(Integer, nullable=True)
    retention_class = Column(Text, nullable=False, default="standard")
    retention_until = Column(DateTime(timezone=True), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    verified_by = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class RxItem(Base):
    __tablename__ = "rx_items"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    rx_id = Column(Text, nullable=False)
    medicine_id = Column(Text, nullable=True)
    raw_medicine_name = Column(Text, nullable=False)
    dosage = Column(Text, nullable=True)
    frequency = Column(Text, nullable=True)
    duration_days = Column(Integer, nullable=True)
    qty_prescribed = Column(Integer, nullable=True)


class RxFlag(Base):
    __tablename__ = "rx_flags"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    rx_id = Column(Text, nullable=False)
    flag_type = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Text, nullable=False, default="warn")
    created_at = Column(DateTime(timezone=True), nullable=False)


class RxOrderLink(Base):
    __tablename__ = "rx_order_links"
    __table_args__ = {"schema": _SCHEMA}

    rx_id = Column(Text, primary_key=True)
    order_id = Column(Text, primary_key=True)
    linked_at = Column(DateTime(timezone=True), nullable=False)


class VerificationQueue(Base):
    __tablename__ = "verification_queue"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    rx_id = Column(Text, nullable=False)
    assigned_to = Column(Text, nullable=True)
    priority = Column(Integer, nullable=False, default=5)
    status = Column(Text, nullable=False, default="pending")
    queued_at = Column(DateTime(timezone=True), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
