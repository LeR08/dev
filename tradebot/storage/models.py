"""SQLite schema. Every row carries ``broker`` and ``mode`` (test/live; market data rows use 'shared')."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class _Tagged:
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    broker: Mapped[str] = mapped_column(String(16), index=True)
    mode: Mapped[str] = mapped_column(String(8), index=True)


class Instrument(_Tagged, Base):
    __tablename__ = "instruments"
    __table_args__ = (UniqueConstraint("broker", "symbol"),)
    symbol: Mapped[str] = mapped_column(String(32))
    currency: Mapped[str] = mapped_column(String(8), default="EUR")
    min_qty: Mapped[float] = mapped_column(Float, default=0.0)
    qty_step: Mapped[float] = mapped_column(Float, default=0.0)
    tick_size: Mapped[float] = mapped_column(Float, default=0.0)
    min_notional: Mapped[float] = mapped_column(Float, default=0.0)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MarketCache(_Tagged, Base):
    __tablename__ = "market_cache"
    __table_args__ = (UniqueConstraint("broker", "kind", "key", "ts"),)
    kind: Mapped[str] = mapped_column(String(32), index=True)  # ohlc, onchain, insider, 13f, http...
    key: Mapped[str] = mapped_column(String(256), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    payload: Mapped[dict | list] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Scan(_Tagged, Base):
    __tablename__ = "scans"
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    scanned: Mapped[int] = mapped_column(Integer)
    passed: Mapped[int] = mapped_column(Integer)
    rejected: Mapped[int] = mapped_column(Integer)
    reasons: Mapped[dict] = mapped_column(JSON, default=dict)  # symbol -> reason
    passed_symbols: Mapped[list] = mapped_column(JSON, default=list)


class Decision(_Tagged, Base):
    __tablename__ = "decisions"
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    result: Mapped[str] = mapped_column(String(16))  # full / half / none
    size_factor: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text, default="")
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    order_client_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    risk_result: Mapped[str | None] = mapped_column(Text, nullable=True)


class VoteRow(_Tagged, Base):
    __tablename__ = "votes"
    decision_id: Mapped[int] = mapped_column(ForeignKey("decisions.id"), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    agent: Mapped[str] = mapped_column(String(32))
    direction: Mapped[str] = mapped_column(String(8))
    confidence: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text, default="")
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)


class OrderRow(_Tagged, Base):
    __tablename__ = "orders"
    client_id: Mapped[str] = mapped_column(String(64), unique=True)
    broker_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    side: Mapped[str] = mapped_column(String(4))
    qty: Mapped[float] = mapped_column(Float)
    order_type: Mapped[str] = mapped_column(String(16))
    limit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    stop_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    stop_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    take_profit: Mapped[float | None] = mapped_column(Float, nullable=True)
    leverage: Mapped[float] = mapped_column(Float, default=1.0, server_default="1.0")
    status: Mapped[str] = mapped_column(String(16))
    purpose: Mapped[str] = mapped_column(String(16))
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class FillRow(_Tagged, Base):
    __tablename__ = "fills"
    order_client_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    broker_order_id: Mapped[str] = mapped_column(String(64))
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    side: Mapped[str] = mapped_column(String(4))
    qty: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    fee: Mapped[float] = mapped_column(Float)  # EUR
    purpose: Mapped[str] = mapped_column(String(16))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class PositionRow(_Tagged, Base):
    __tablename__ = "positions"
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(8), default="open", index=True)  # open / closed
    side: Mapped[str] = mapped_column(String(8), default="long", server_default="long")  # long / short
    leverage: Mapped[float] = mapped_column(Float, default=1.0, server_default="1.0")
    qty: Mapped[float] = mapped_column(Float)  # always positive; see side
    currency: Mapped[str] = mapped_column(String(8), default="EUR")
    entry_price: Mapped[float] = mapped_column(Float)
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    take_profit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    stop_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # current (may trail)
    initial_stop_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pnl: Mapped[float | None] = mapped_column(Float, nullable=True)  # EUR, net of fees
    fees: Mapped[float] = mapped_column(Float, default=0.0)  # EUR
    entry_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stop_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    size_factor: Mapped[float] = mapped_column(Float, default=1.0)
    entry_agents: Mapped[list] = mapped_column(JSON, default=list)


class EquitySnapshot(_Tagged, Base):
    __tablename__ = "equity_snapshots"
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    equity: Mapped[float] = mapped_column(Float)
    cash: Mapped[float] = mapped_column(Float)
    exposure: Mapped[float] = mapped_column(Float)
    daily_pnl: Mapped[float] = mapped_column(Float, default=0.0)


class ModeChange(_Tagged, Base):
    __tablename__ = "mode_changes"
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    previous_mode: Mapped[str | None] = mapped_column(String(8), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    actor: Mapped[str] = mapped_column(String(16))


class RiskEventRow(_Tagged, Base):
    __tablename__ = "risk_events"
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    kind: Mapped[str] = mapped_column(String(32))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
