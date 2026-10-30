"""Database access: thin helpers over the SQLAlchemy models (local SQLite file)."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine, event, func, inspect, select, text
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from tradebot.storage.models import (
    Base,
    Decision,
    EquitySnapshot,
    FillRow,
    Instrument,
    MarketCache,
    ModeChange,
    OrderRow,
    PositionRow,
    RiskEventRow,
    Scan,
    VoteRow,
)

SHARED = "shared"  # mode tag for market data shared by test and live


def as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class Database:
    def __init__(self, url: str | Path = "sqlite:///:memory:"):
        if isinstance(url, Path):
            url.parent.mkdir(parents=True, exist_ok=True)
            url = f"sqlite:///{url}"
        extra = {"poolclass": StaticPool} if ":memory:" in str(url) else {}
        self.engine = create_engine(url, connect_args={"check_same_thread": False}, future=True, **extra)

        @event.listens_for(self.engine, "connect")
        def _pragmas(conn, _):  # pragma: no cover - trivial
            cur = conn.cursor()
            if ":memory:" not in str(url):
                cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

        Base.metadata.create_all(self.engine)
        self._migrate()
        self._sessions = sessionmaker(self.engine, expire_on_commit=False)

    def _migrate(self) -> None:
        """Add columns introduced after a database was created (SQLite ALTER TABLE ADD COLUMN)."""
        insp = inspect(self.engine)
        with self.engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                existing = {c["name"] for c in insp.get_columns(table.name)}
                for col in table.columns:
                    if col.name in existing:
                        continue
                    ddl = f'ALTER TABLE {table.name} ADD COLUMN "{col.name}" {col.type.compile(self.engine.dialect)}'
                    if col.server_default is not None:
                        ddl += f" DEFAULT '{col.server_default.arg}'"
                    conn.execute(text(ddl))

    @contextmanager
    def session(self) -> Iterator[Session]:
        s = self._sessions()
        try:
            yield s
            s.commit()
        except Exception:
            s.rollback()
            raise
        finally:
            s.close()

    def add(self, row):
        with self.session() as s:
            s.add(row)
            s.flush()
            return row

    # ------------------------------------------------------------------ recorders

    def record_mode_change(self, broker, mode, previous, reason: str, actor: str) -> None:
        self.add(ModeChange(broker=str(broker), mode=str(mode), previous_mode=str(previous) if previous else None,
                            reason=reason, actor=actor))

    def record_risk_event(self, ev) -> None:
        self.add(RiskEventRow(broker=str(ev.broker), mode=ev.detail.get("mode", "n/a"), kind=str(ev.kind),
                              detail=ev.detail, ts=ev.ts))

    def record_scan(self, broker, mode, result) -> None:
        self.add(Scan(broker=str(broker), mode=str(mode), ts=result.ts, scanned=result.scanned,
                      passed=len(result.passed), rejected=len(result.rejected), reasons=result.rejected,
                      passed_symbols=result.passed))

    def record_decision(self, broker, mode, symbol: str, decision, votes, risk_result: str | None = None,
                        order_client_id: str | None = None) -> int:
        with self.session() as s:
            d = Decision(broker=str(broker), mode=str(mode), symbol=symbol, result=decision.label,
                         size_factor=decision.size_factor, reason=decision.reason,
                         target_price=decision.target_price, risk_result=risk_result,
                         order_client_id=order_client_id)
            s.add(d)
            s.flush()
            for v in votes:
                s.add(VoteRow(broker=str(broker), mode=str(mode), decision_id=d.id, symbol=symbol, agent=v.agent,
                              direction=str(v.direction), confidence=v.confidence, reason=v.reason,
                              target_price=v.target_price))
            return d.id

    def update_decision(self, decision_id: int, risk_result: str, order_client_id: str | None) -> None:
        with self.session() as s:
            d = s.get(Decision, decision_id)
            if d:
                d.risk_result = risk_result
                d.order_client_id = order_client_id

    def record_order(self, broker, mode, req, order=None, status: str | None = None, error: str | None = None) -> None:
        with self.session() as s:
            row = s.scalar(select(OrderRow).where(OrderRow.client_id == req.client_id))
            if row is None:
                row = OrderRow(broker=str(broker), mode=str(mode), client_id=req.client_id, symbol=req.symbol,
                               side=str(req.side), qty=req.qty, order_type=str(req.order_type),
                               limit_price=req.limit_price, stop_price=req.stop_price, stop_loss=req.stop_loss,
                               take_profit=req.take_profit, leverage=req.leverage, purpose=str(req.purpose),
                               status="pending")
                s.add(row)
            if order is not None:
                row.broker_order_id = order.id
                row.status = str(order.status)
                row.qty = order.qty
                if order.reason:
                    row.error = order.reason
            if status:
                row.status = status
            if error:
                row.error = error

    def update_order_status(self, broker_order_id: str, status: str) -> None:
        with self.session() as s:
            row = s.scalar(select(OrderRow).where(OrderRow.broker_order_id == broker_order_id))
            if row:
                row.status = status

    def record_fill(self, broker, mode, fill, fee_eur: float) -> None:
        self.add(FillRow(broker=str(broker), mode=str(mode), order_client_id=fill.client_id,
                         broker_order_id=fill.order_id, symbol=fill.symbol, side=str(fill.side), qty=fill.qty,
                         price=fill.price, fee=fee_eur, purpose=str(fill.purpose), ts=fill.ts))

    def record_equity(self, broker, mode, equity: float, cash: float, exposure: float, daily_pnl: float,
                      ts: datetime | None = None) -> None:
        self.add(EquitySnapshot(broker=str(broker), mode=str(mode), equity=equity, cash=cash, exposure=exposure,
                                daily_pnl=daily_pnl, ts=ts or datetime.now(timezone.utc)))

    # ------------------------------------------------------------------ positions

    def open_position(self, **kw) -> PositionRow:
        kw["broker"], kw["mode"] = str(kw["broker"]), str(kw["mode"])
        return self.add(PositionRow(**kw))

    def open_positions(self, broker, mode) -> list[PositionRow]:
        with self.session() as s:
            return list(s.scalars(select(PositionRow).where(
                PositionRow.broker == str(broker), PositionRow.mode == str(mode), PositionRow.status == "open")))

    def update_position(self, pos_id: int, **kw) -> None:
        with self.session() as s:
            row = s.get(PositionRow, pos_id)
            for k, v in kw.items():
                setattr(row, k, v)

    def close_position(self, pos_id: int, exit_price: float, reason: str, pnl: float, fees: float,
                       ts: datetime | None = None) -> None:
        self.update_position(pos_id, status="closed", exit_price=exit_price, exit_reason=reason, pnl=pnl,
                             fees=fees, closed_at=ts or datetime.now(timezone.utc))

    def count_closed_positions(self, broker, mode) -> int:
        with self.session() as s:
            return s.scalar(select(func.count(PositionRow.id)).where(
                PositionRow.broker == str(broker), PositionRow.mode == str(mode),
                PositionRow.status == "closed")) or 0

    def first_activity(self, broker, mode) -> datetime | None:
        with self.session() as s:
            a = s.scalar(select(func.min(EquitySnapshot.ts)).where(
                EquitySnapshot.broker == str(broker), EquitySnapshot.mode == str(mode)))
            b = s.scalar(select(func.min(PositionRow.opened_at)).where(
                PositionRow.broker == str(broker), PositionRow.mode == str(mode)))
        vals = [as_utc(x) for x in (a, b) if x is not None]
        return min(vals) if vals else None

    def realized_pnl(self, broker, mode) -> float:
        with self.session() as s:
            return float(s.scalar(select(func.coalesce(func.sum(PositionRow.pnl), 0.0)).where(
                PositionRow.broker == str(broker), PositionRow.mode == str(mode),
                PositionRow.status == "closed")) or 0.0)

    def closed_positions(self, broker=None, mode=None, since: datetime | None = None) -> list[PositionRow]:
        with self.session() as s:
            q = select(PositionRow).where(PositionRow.status == "closed")
            if broker:
                q = q.where(PositionRow.broker == str(broker))
            if mode:
                q = q.where(PositionRow.mode == str(mode))
            if since:
                q = q.where(PositionRow.closed_at >= since)
            return list(s.scalars(q.order_by(PositionRow.closed_at)))

    def equity_curve(self, broker, mode, since: datetime | None = None) -> list[EquitySnapshot]:
        with self.session() as s:
            q = select(EquitySnapshot).where(EquitySnapshot.broker == str(broker), EquitySnapshot.mode == str(mode))
            if since:
                q = q.where(EquitySnapshot.ts >= since)
            return list(s.scalars(q.order_by(EquitySnapshot.ts)))

    def fees_paid(self, broker, mode, since: datetime | None = None) -> float:
        with self.session() as s:
            q = select(func.coalesce(func.sum(FillRow.fee), 0.0)).where(
                FillRow.broker == str(broker), FillRow.mode == str(mode))
            if since:
                q = q.where(FillRow.ts >= since)
            return float(s.scalar(q) or 0.0)

    def last_decisions(self, limit: int = 20, symbol: str | None = None) -> list[tuple[Decision, list[VoteRow]]]:
        with self.session() as s:
            q = select(Decision).order_by(Decision.id.desc()).limit(limit)
            if symbol:
                q = q.where(Decision.symbol == symbol)
            out = []
            for d in s.scalars(q):
                votes = list(s.scalars(select(VoteRow).where(VoteRow.decision_id == d.id)))
                out.append((d, votes))
            return out

    def last_scan(self, broker) -> Scan | None:
        with self.session() as s:
            return s.scalar(select(Scan).where(Scan.broker == str(broker)).order_by(Scan.id.desc()).limit(1))

    def mode_changes(self, limit: int = 50) -> list[ModeChange]:
        with self.session() as s:
            return list(s.scalars(select(ModeChange).order_by(ModeChange.id.desc()).limit(limit)))

    # ------------------------------------------------------------------ instruments / cache

    def upsert_instrument(self, broker, rules, meta: dict | None = None) -> None:
        with self.session() as s:
            row = s.scalar(select(Instrument).where(Instrument.broker == str(broker), Instrument.symbol == rules.symbol))
            if row is None:
                row = Instrument(broker=str(broker), mode=SHARED, symbol=rules.symbol)
                s.add(row)
            row.currency, row.min_qty, row.qty_step = rules.currency, rules.min_qty, rules.qty_step
            row.tick_size, row.min_notional, row.meta = rules.tick_size, rules.min_notional, meta or {}
            row.updated_at = datetime.now(timezone.utc)

    def cache_put_many(self, broker: str, kind: str, key: str, items: list[tuple[datetime, dict | list]]) -> None:
        if not items:
            return
        now = datetime.now(timezone.utc)
        rows = [dict(broker=str(broker), mode=SHARED, kind=kind, key=key, ts=ts, payload=payload, fetched_at=now)
                for ts, payload in items]
        with self.session() as s:
            for chunk in range(0, len(rows), 500):
                stmt = sqlite_insert(MarketCache).values(rows[chunk:chunk + 500])
                stmt = stmt.on_conflict_do_update(
                    index_elements=["broker", "kind", "key", "ts"],
                    set_={"payload": stmt.excluded.payload, "fetched_at": stmt.excluded.fetched_at})
                s.execute(stmt)

    def cache_get(self, broker: str, kind: str, key: str, since: datetime | None = None,
                  until: datetime | None = None) -> list[tuple[datetime, dict | list]]:
        with self.session() as s:
            q = select(MarketCache.ts, MarketCache.payload).where(
                MarketCache.broker == str(broker), MarketCache.kind == kind, MarketCache.key == key)
            if since:
                q = q.where(MarketCache.ts >= since)
            if until:
                q = q.where(MarketCache.ts <= until)
            return [(as_utc(ts), p) for ts, p in s.execute(q.order_by(MarketCache.ts))]

    def cache_latest(self, broker: str, kind: str, key: str) -> tuple[datetime, dict | list, datetime] | None:
        with self.session() as s:
            row = s.scalar(select(MarketCache).where(
                MarketCache.broker == str(broker), MarketCache.kind == kind, MarketCache.key == key
            ).order_by(MarketCache.ts.desc()).limit(1))
            return (as_utc(row.ts), row.payload, as_utc(row.fetched_at)) if row else None

    def cache_keys(self, broker: str, kind: str) -> list[str]:
        with self.session() as s:
            return list(s.scalars(select(MarketCache.key).where(
                MarketCache.broker == str(broker), MarketCache.kind == kind).distinct()))
