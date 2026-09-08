from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SnapshotRow(Base):
    __tablename__ = "snapshots"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    symbol: Mapped[str] = mapped_column(Text, index=True)
    classification: Mapped[str] = mapped_column(Text)
    depth: Mapped[dict] = mapped_column(JSONB)
    ticker: Mapped[dict] = mapped_column(JSONB)
    exchange_info: Mapped[dict] = mapped_column(JSONB)
    hash: Mapped[str] = mapped_column(Text, unique=True)


class ConstitutionRow(Base):
    __tablename__ = "constitution"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(Text, index=True)
    payload: Mapped[dict] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IntentRow(Base):
    __tablename__ = "intents"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    raw_text: Mapped[str] = mapped_column(Text)
    parsed: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DecisionRow(Base):
    __tablename__ = "decisions"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    intent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("intents.id"))
    snapshot_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("snapshots.id"))
    capacity: Mapped[dict] = mapped_column(JSONB)
    action: Mapped[str] = mapped_column(Text)
    binding: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ApprovalRow(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    decision_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("decisions.id"))
    snapshot_hash: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text)
    token_hash: Mapped[str] = mapped_column(Text)


class PositionRow(Base):
    __tablename__ = "positions"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    symbol: Mapped[str] = mapped_column(Text, index=True)
    qty: Mapped[float] = mapped_column(Numeric)
    avg_px: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ObservationRow(Base):
    __tablename__ = "capacity_observations"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    symbol: Mapped[str] = mapped_column(Text, index=True)
    cost_cap: Mapped[float] = mapped_column(Numeric)
    time_cap: Mapped[float] = mapped_column(Numeric)
    binding: Mapped[str] = mapped_column(Text)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FillRow(Base):
    __tablename__ = "fills"
    __table_args__ = (UniqueConstraint("client_order_id", name="uq_fills_client_order_id"),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    client_order_id: Mapped[str] = mapped_column(Text)
    order_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    executed_qty: Mapped[float] = mapped_column(Numeric)
    cumm_quote: Mapped[float] = mapped_column(Numeric)
    status: Mapped[str] = mapped_column(Text)
    raw: Mapped[dict] = mapped_column(JSONB)


class AuditRow(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    kind: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB)
