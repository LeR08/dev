"""RiskManager: the only gate between decisions and broker adapters.

Every order (test or live, entry or exit) must carry a ``RiskApproval``
produced here; adapters call :func:`ensure_approved` and refuse anything else.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import math
import secrets
from collections import deque
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta
from enum import StrEnum
from typing import Callable

from tradebot.brokers.base import (
    Broker,
    InstrumentRules,
    Mode,
    OrderRequest,
    OrderType,
    Purpose,
    Side,
    UnapprovedOrder,
    utcnow,
)
from tradebot.settings import BrokerRiskCfg, RiskConfig

log = logging.getLogger(__name__)

_APPROVAL_KEY = secrets.token_bytes(32)  # per-process; approvals cannot be forged or persisted
APPROVAL_MAX_AGE = timedelta(minutes=5)


@dataclass(frozen=True)
class RiskApproval:
    client_id: str
    symbol: str
    side: str
    qty: float
    stop_loss: float | None
    leverage: float
    purpose: str
    mode: str
    issued_at: datetime
    signature: str


def _signature(client_id: str, symbol: str, side: str, qty: float, stop_loss: float | None, leverage: float,
               purpose: str, mode: str, issued_at: datetime) -> str:
    msg = (f"{client_id}|{symbol}|{side}|{qty!r}|{stop_loss!r}|{leverage!r}|{purpose}|{mode}|"
           f"{issued_at.isoformat()}")
    return hmac.new(_APPROVAL_KEY, msg.encode(), hashlib.sha256).hexdigest()


def ensure_approved(req: OrderRequest, mode: Mode, now: datetime | None = None) -> None:
    """Raise UnapprovedOrder unless ``req`` carries a matching, fresh approval."""
    a = req.approval
    if not isinstance(a, RiskApproval):
        raise UnapprovedOrder("order has no RiskManager approval")
    if (a.client_id, a.symbol, a.side, a.qty, a.stop_loss, a.leverage, a.purpose, a.mode) != (
        req.client_id, req.symbol, str(req.side), req.qty, req.stop_loss, req.leverage, str(req.purpose), str(mode)
    ):
        raise UnapprovedOrder("order differs from what the RiskManager approved")
    expected = _signature(a.client_id, a.symbol, a.side, a.qty, a.stop_loss, a.leverage, a.purpose, a.mode,
                          a.issued_at)
    if not hmac.compare_digest(expected, a.signature):
        raise UnapprovedOrder("invalid approval signature")
    if (now or utcnow()) - a.issued_at > APPROVAL_MAX_AGE:
        raise UnapprovedOrder("approval expired")
    if req.purpose == Purpose.ENTRY and req.stop_loss is None:
        raise UnapprovedOrder("entry without stop-loss")


@dataclass
class PositionInfo:
    qty: float  # signed: negative = short
    value_eur: float  # absolute notional in EUR
    leverage: float = 1.0


@dataclass
class AccountState:
    broker: Broker
    mode: Mode
    equity: float  # EUR, equity used for sizing
    cash: float  # EUR available
    positions: dict[str, PositionInfo] = field(default_factory=dict)
    open_entry_value: float = 0.0  # EUR committed in resting entry orders
    open_entry_count: int = 0
    day_start_equity: float | None = None
    peak_equity: float | None = None
    fx: float = 1.0  # instrument currency -> EUR for the order being checked

    @property
    def exposure(self) -> float:
        """Gross notional: longs + shorts + resting entries."""
        return sum(abs(p.value_eur) for p in self.positions.values()) + self.open_entry_value

    @property
    def margin_used(self) -> float:
        return sum(abs(p.value_eur) / max(1.0, p.leverage) for p in self.positions.values())


@dataclass
class RiskDecision:
    approved: bool
    request: OrderRequest | None
    reason: str = ""
    resized: bool = False


class RiskEventKind(StrEnum):
    DAILY_LOSS = "daily_loss_limit"
    DRAWDOWN = "drawdown_limit"
    THROTTLE = "order_throttle"
    REFUSED = "order_refused"
    RESIZED = "order_resized"
    LIMIT_CHANGED = "limit_changed"
    MANUAL_REVIEW = "manual_review"


@dataclass
class RiskEvent:
    broker: Broker
    kind: RiskEventKind
    detail: dict
    ts: datetime = field(default_factory=utcnow)


@dataclass
class Halt:
    reason: str
    until_day: date | None  # None = until manual review


class RiskManager:
    def __init__(self, config: RiskConfig, clock: Callable[[], datetime] = utcnow,
                 on_event: Callable[[RiskEvent], None] | None = None,
                 mode_of: Callable[[Broker], Mode] | None = None):
        self.config = config
        self.mode_of = mode_of
        self.clock = clock
        self.on_event = on_event
        self._order_times: dict[str, deque[datetime]] = {b.value: deque() for b in Broker}
        self._halts: dict[str, Halt] = {}

    # ------------------------------------------------------------------ config

    def cfg(self, broker: Broker | str) -> BrokerRiskCfg:
        return self.config.for_broker(str(broker))

    def set_limit(self, key: str, value: str) -> list[str]:
        """``risk set`` — key is ``<broker>.<field>`` or ``<field>`` (both brokers)."""
        if "." in key:
            broker, fld = key.split(".", 1)
            brokers = [broker]
        else:
            fld, brokers = key, [b.value for b in Broker]
        changed = []
        for b in brokers:
            cfg = self.cfg(b)
            if fld not in type(cfg).model_fields:
                raise KeyError(f"unknown risk limit '{fld}'")
            old = getattr(cfg, fld)
            parsed: object = None if value.lower() in ("none", "null", "") else value
            setattr(cfg, fld, parsed)  # validate_assignment -> pydantic checks type and bounds
            changed.append(f"{b}.{fld}: {old} -> {getattr(cfg, fld)}")
            self._emit(Broker(b), RiskEventKind.LIMIT_CHANGED, {"field": fld, "old": old, "new": getattr(cfg, fld)})
        return changed

    def limits_set(self, broker: Broker) -> tuple[bool, list[str]]:
        cfg = self.cfg(broker)
        missing = [k for k, v in cfg.model_dump().items() if v is None]
        return (not missing, missing)

    # ------------------------------------------------------------------ halts

    def halt(self, broker: Broker, reason: str, until_day: date | None) -> None:
        self._halts[str(broker)] = Halt(reason, until_day)

    def clear_halt(self, broker: Broker) -> None:
        self._halts.pop(str(broker), None)

    def review(self, broker: Broker) -> str | None:
        """Operator review after a drawdown halt: clears the halt (mode stays TEST)."""
        reason = self.halt_reason(broker)
        self.clear_halt(broker)
        self._emit(Broker(broker), RiskEventKind.MANUAL_REVIEW, {"cleared": reason})
        return reason

    def halt_reason(self, broker: Broker) -> str | None:
        h = self._halts.get(str(broker))
        if h is None:
            return None
        if h.until_day is not None and self.clock().date() >= h.until_day:
            del self._halts[str(broker)]
            return None
        return h.reason

    # ------------------------------------------------------------------ sizing

    def capital(self, broker: Broker, acct: AccountState) -> float:
        cfg = self.cfg(broker)
        if acct.mode == Mode.LIVE:
            if cfg.live_capital_cap_eur is None:
                return 0.0
            return max(0.0, min(acct.equity, cfg.live_capital_cap_eur))
        return max(0.0, acct.equity)

    def _throttled(self, broker: Broker) -> bool:
        cfg = self.cfg(broker)
        now = self.clock()
        q = self._order_times[str(broker)]
        while q and now - q[0] > timedelta(seconds=60):
            q.popleft()
        return len(q) >= cfg.max_orders_per_minute

    def _refuse(self, broker: Broker, req: OrderRequest, reason: str) -> RiskDecision:
        self._emit(broker, RiskEventKind.REFUSED, {"symbol": req.symbol, "side": str(req.side),
                                                   "purpose": str(req.purpose), "reason": reason})
        return RiskDecision(False, None, reason)

    def approve(self, broker: Broker, req: OrderRequest, acct: AccountState,
                rules: InstrumentRules | None = None, size_factor: float = 1.0,
                emergency: bool = False) -> RiskDecision:
        """Check (and if needed resize) an order. Returns an approved copy or a refusal.

        Entries open a long (buy) or a short (sell); every other purpose must
        reduce an existing position (no flipping, no adding through exits).
        """
        broker = Broker(broker)
        cfg = self.cfg(broker)
        rules = rules or InstrumentRules(req.symbol)
        req = replace(req, approval=None)
        resized = False

        if not emergency and self._throttled(broker):
            self._emit(broker, RiskEventKind.THROTTLE, {"symbol": req.symbol,
                                                        "max_per_minute": cfg.max_orders_per_minute})
            return RiskDecision(False, None, f"throttled: more than {cfg.max_orders_per_minute} orders/minute")

        if req.qty <= 0:
            return self._refuse(broker, req, "quantity must be positive")

        held = acct.positions.get(req.symbol)
        held_qty = held.qty if held else 0.0

        if req.purpose == Purpose.ENTRY:
            short = req.side == Side.SELL
            if req.order_type == OrderType.MARKET:
                return self._refuse(broker, req, "market orders are reserved for exits")
            reason = self.halt_reason(broker)
            if reason:
                return self._refuse(broker, req, f"new entries halted: {reason}")
            if short and not (cfg.allow_short and rules.shortable):
                return self._refuse(broker, req, "short selling disabled for this broker/instrument")
            if acct.mode == Mode.LIVE and cfg.live_capital_cap_eur is None:
                return self._refuse(broker, req, "live capital cap not set")
            price = req.limit_price or req.reference_price
            if not price or price <= 0:
                return self._refuse(broker, req, "entry needs a positive limit price")
            if size_factor <= 0:
                return self._refuse(broker, req, "size factor is zero")
            if abs(held_qty) > 0:
                return self._refuse(broker, req, "position already open on this symbol")
            if len(acct.positions) + acct.open_entry_count >= cfg.max_open_positions:
                return self._refuse(broker, req, f"max open positions ({cfg.max_open_positions}) reached")

            lev = float(max(1, math.floor(min(req.leverage, cfg.max_leverage, rules.max_leverage))))  # whole x
            if lev < req.leverage - 1e-9:
                resized = True
            if short:
                cap_stop = rules.round_price(price * (1 + cfg.stop_loss_pct / 100), Side.BUY)
                stop = min(req.stop_loss or cap_stop, cap_stop)
                if stop <= price:
                    return self._refuse(broker, req, "short stop-loss must be above entry price")
                if req.take_profit is not None and req.take_profit >= price:
                    return self._refuse(broker, req, "short take-profit must be below entry price")
            else:
                floor_stop = rules.round_price(price * (1 - cfg.stop_loss_pct / 100), Side.SELL)
                stop = max(req.stop_loss or 0.0, floor_stop)
                if stop >= price:
                    return self._refuse(broker, req, "stop-loss must be below entry price")
                if req.take_profit is not None and req.take_profit <= price:
                    return self._refuse(broker, req, "take-profit must be above entry price")

            capital = self.capital(broker, acct)
            pct = cfg.max_position_pct_full if size_factor >= 1.0 else cfg.max_position_pct_half
            unit_eur = price * acct.fx
            max_qty = capital * pct / 100 * lev / unit_eur
            if cfg.risk_per_trade_pct:
                # fixed-fractional risk: a stop-out costs at most risk_per_trade_pct of capital (x size factor)
                risk_eur = capital * cfg.risk_per_trade_pct / 100 * min(1.0, size_factor)
                max_qty = min(max_qty, risk_eur / (abs(price - stop) * acct.fx))
            room = capital * cfg.max_exposure_pct / 100 - acct.exposure
            if room <= 0:
                return self._refuse(broker, req, f"max gross exposure ({cfg.max_exposure_pct}%) reached")
            max_qty = min(max_qty, room / unit_eur)
            if lev <= 1.0 and not short:
                max_qty = min(max_qty, acct.cash * 0.995 / unit_eur)  # spot long: paid in cash
            else:
                free_margin = acct.equity - acct.margin_used
                max_qty = min(max_qty, free_margin * 0.95 * lev / unit_eur)  # margin: collateral = notional/lev
            qty = rules.round_qty(min(req.qty, max_qty))
            if qty < req.qty - 1e-12:
                resized = True
            if qty <= 0 or qty < rules.min_qty or qty * price < rules.min_notional:
                return self._refuse(broker, req, "size below broker minimum after applying limits")
            req = replace(req, qty=qty, stop_loss=stop, leverage=lev)

        else:  # exits, stops, take-profits, emergency closes: reduce only
            if held_qty == 0:
                return self._refuse(broker, req, "no position to close")
            closing_side = Side.SELL if held_qty > 0 else Side.BUY
            if req.side != closing_side:
                return self._refuse(broker, req, "exit would increase the position (reduce-only)")
            if req.order_type == OrderType.MARKET and req.purpose not in (Purpose.EXIT, Purpose.EMERGENCY):
                return self._refuse(broker, req, "market orders only for exits")
            qty = min(req.qty, abs(held_qty))
            if qty < req.qty - 1e-12:
                resized = True
            req = replace(req, qty=qty, stop_loss=None, leverage=held.leverage if held else req.leverage)

        if resized:
            self._emit(broker, RiskEventKind.RESIZED, {"symbol": req.symbol, "qty": req.qty,
                                                       "leverage": req.leverage})
        now = self.clock()
        args = (req.client_id, req.symbol, str(req.side), req.qty, req.stop_loss, req.leverage, str(req.purpose),
                str(acct.mode))
        req.approval = RiskApproval(*args, issued_at=now, signature=_signature(*args, now))
        self._order_times[str(broker)].append(now)
        return RiskDecision(True, req, "resized" if resized else "ok", resized)

    # ------------------------------------------------------------------ account limits

    def evaluate_account(self, broker: Broker, acct: AccountState) -> list[RiskEvent]:
        """Daily-loss and drawdown checks. The caller closes positions and falls back to test."""
        cfg = self.cfg(broker)
        events: list[RiskEvent] = []
        eq = acct.equity
        if acct.day_start_equity and acct.day_start_equity > 0:
            loss_pct = (acct.day_start_equity - eq) / acct.day_start_equity * 100
            if loss_pct >= cfg.daily_loss_limit_pct:
                events.append(self._emit(broker, RiskEventKind.DAILY_LOSS,
                                         {"loss_pct": round(loss_pct, 3), "limit": cfg.daily_loss_limit_pct}))
        if acct.peak_equity and acct.peak_equity > 0:
            dd_pct = (acct.peak_equity - eq) / acct.peak_equity * 100
            if dd_pct >= cfg.max_drawdown_pct:
                events.append(self._emit(broker, RiskEventKind.DRAWDOWN,
                                         {"drawdown_pct": round(dd_pct, 3), "limit": cfg.max_drawdown_pct}))
        return events

    def _emit(self, broker: Broker, kind: RiskEventKind, detail: dict) -> RiskEvent:
        detail = {**detail, "mode": str(self.mode_of(broker)) if self.mode_of else "test"}
        ev = RiskEvent(broker, kind, detail, self.clock())
        level = logging.INFO if kind in (RiskEventKind.RESIZED, RiskEventKind.LIMIT_CHANGED,
                                        RiskEventKind.MANUAL_REVIEW) else logging.WARNING
        log.log(level, "risk %s %s", kind.value, detail, extra={"broker": str(broker)})
        if self.on_event:
            try:
                self.on_event(ev)
            except Exception:  # never let storage break risk checks
                log.exception("risk event sink failed")
        return ev
