from sqlalchemy import BigInteger, Boolean, Column, Computed, Date, DateTime, Integer, Text
from app.db.base_model import Base

_SCHEMA = "inventory_m"


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = {"schema": _SCHEMA}

    pharmacy_id = Column(Text, primary_key=True)
    medicine_id = Column(Text, primary_key=True)
    qty_on_hand = Column(Integer, nullable=False, default=0)
    qty_reserved = Column(Integer, nullable=False, default=0)
    qty_available = Column(Integer, Computed("qty_on_hand - qty_reserved", persisted=True), nullable=True)
    reorder_level = Column(Integer, nullable=False, default=0)
    selling_price_paise = Column(BigInteger, nullable=False)
    mrp_paise = Column(BigInteger, nullable=False)
    discount_bps = Column(
        Integer,
        Computed(
            "CASE WHEN mrp_paise = 0 THEN 0 "
            "ELSE ((mrp_paise - selling_price_paise) * 10000 / mrp_paise)::INT END",
            persisted=True,
        ),
        nullable=True,
    )
    current_batch_no = Column(Text, nullable=True)
    current_expiry = Column(Date, nullable=True)
    source = Column(Text, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=False)
    is_listed = Column(Boolean, nullable=False, default=True)
    unlisted_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


class InventoryBatch(Base):
    __tablename__ = "inventory_batches"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    pharmacy_id = Column(Text, nullable=False)
    medicine_id = Column(Text, nullable=False)
    batch_no = Column(Text, nullable=False)
    manufacture_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False)
    qty_received = Column(Integer, nullable=False)
    qty_remaining = Column(Integer, nullable=False)
    cost_paise = Column(BigInteger, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(Text, primary_key=True)
    pharmacy_id = Column(Text, nullable=False)
    medicine_id = Column(Text, nullable=False)
    order_id = Column(Text, nullable=False)
    qty = Column(Integer, nullable=False)
    state = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    state_changed_at = Column(DateTime(timezone=True), nullable=False)


class InventoryLedger(Base):
    __tablename__ = "inventory_ledger"
    __table_args__ = {"schema": _SCHEMA}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pharmacy_id = Column(Text, nullable=False)
    medicine_id = Column(Text, nullable=False)
    delta_qty = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    reference_id = Column(Text, nullable=True)
    qty_after = Column(Integer, nullable=False)
    actor_id = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False)


class ErpSyncState(Base):
    __tablename__ = "erp_sync_state"
    __table_args__ = {"schema": _SCHEMA}

    pharmacy_id = Column(Text, primary_key=True)
    erp_kind = Column(Text, nullable=False)
    last_full_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_delta_sync_at = Column(DateTime(timezone=True), nullable=True)
    cursor_token = Column(Text, nullable=True)
    consecutive_failures = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    is_paused = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
