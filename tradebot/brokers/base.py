"""Common broker interface and shared value types.

Only adapters know broker specifics; the engine talks to this interface.
"""

from __future__ import annotations

import math
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Awaitable, Callable


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Broker(StrEnum):
    KRAKEN = "kraken"
    IBKR = "ibkr"


class Mode(StrEnum):
    TEST = "test"
    LIVE = "live"


class Side(StrEnum):
    BUY = "buy"
    SELL = "sell"


class PositionSide(StrEnum):
    LONG = "long"
    SHORT = "short"

    @property
    def entry_side(self) -> "Side":
        return Side.BUY if self == PositionSide.LONG else Side.SELL

    @property
    def exit_side(self) -> "Side":
        return Side.SELL if self == PositionSide.LONG else Side.BUY

    @property
    def sign(self) -> int:
        return 1 if self == PositionSide.LONG else -1


class OrderType(StrEnum):
    LIMIT = "limit"
    MARKET = "market"
    STOP_LOSS = "stop-loss"


class OrderStatus(StrEnum):
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class Purpose(StrEnum):
    ENTRY = "entry"
    EXIT = "exit"
    STOP = "stop"
    TAKE_PROFIT = "take_profit"
    EMERGENCY = "emergency"


# --------------------------------------------------------------------------- errors


class BrokerError(Exception):
    """Generic broker failure (network, unexpected response...)."""


class OrderRejected(BrokerError):
    pass


class MarketClosed(OrderRejected):
    pass


class RateLimited(BrokerError):
    pass


class ModeViolation(BrokerError):
    """An action would contradict the current test/live mode."""


class UnapprovedOrder(OrderRejected):
    """An order reached an adapter without a valid RiskManager approval."""


# --------------------------------------------------------------------------- market data


@dataclass(frozen=True)
class Quote:
    symbol: str
    bid: float
    ask: float
    last: float
    volume: float = 0.0  # 24h (Kraken) or day volume (IBKR)
    ts: datetime = field(default_factory=utcnow)

    @property
    def mid(self) -> float:
        if self.bid > 0 and self.ask > 0:
            return (self.bid + self.ask) / 2
        return self.last

    @property
    def spread_bps(self) -> float:
        m = self.mid
        if m <= 0 or self.bid <= 0 or self.ask <= 0:
            return math.inf
        return (self.ask - self.bid) / m * 10_000


@dataclass(frozen=True)
class OrderBook:
    symbol: str
    bids: tuple[tuple[float, float], ...]  # (price, qty), best first
    asks: tuple[tuple[float, float], ...]
    ts: datetime = field(default_factory=utcnow)

    @property
    def best_bid(self) -> float | None:
        return self.bids[0][0] if self.bids else None

    @property
    def best_ask(self) -> float | None:
        return self.asks[0][0] if self.asks else None

    def depth_notional(self, side: Side, levels: int) -> float:
        book = self.bids if side == Side.BUY else self.asks
        return sum(p * q for p, q in book[:levels])

    def to_quote(self, last: float | None = None) -> Quote:
        bid = self.best_bid or 0.0
        ask = self.best_ask or 0.0
        return Quote(self.symbol, bid, ask, last if last is not None else (bid + ask) / 2, ts=self.ts)


@dataclass(frozen=True)
class Bar:
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


# --------------------------------------------------------------------------- account


@dataclass
class Balance:
    asset: str
    total: float
    available: float


@dataclass
class Position:
    symbol: str
    qty: float  # signed: negative = short
    avg_price: float
    currency: str = "EUR"

    @property
    def side(self) -> PositionSide:
        return PositionSide.LONG if self.qty >= 0 else PositionSide.SHORT


@dataclass(frozen=True)
class InstrumentRules:
    symbol: str
    currency: str = "EUR"
    min_qty: float = 0.0
    qty_step: float = 0.0  # 0 = free; 1 = whole shares
    tick_size: float = 0.0
    min_notional: float = 0.0
    max_leverage: float = 10.0  # broker-side cap for this instrument (Kraken: AssetPairs leverage lists)
    shortable: bool = True

    def round_qty(self, qty: float) -> float:
        if self.qty_step > 0:
            return math.floor(qty / self.qty_step + 1e-9) * self.qty_step
        return qty

    def round_price(self, price: float, side: Side) -> float:
        if self.tick_size <= 0:
            return price
        ticks = price / self.tick_size
        # buy: round down (never pay more); sell: round up (never sell lower)
        n = math.floor(ticks + 1e-9) if side == Side.BUY else math.ceil(ticks - 1e-9)
        return round(n * self.tick_size, 12)


@dataclass(frozen=True)
class Fees:
    """Fee rates as fractions (0.0025 = 0.25 %)."""

    maker: float
    taker: float


# --------------------------------------------------------------------------- orders


@dataclass
class OrderRequest:
    symbol: str
    side: Side
    qty: float
    order_type: OrderType = OrderType.LIMIT
    limit_price: float | None = None
    stop_price: float | None = None
    post_only: bool = False
    take_profit: float | None = None  # bracket child (IBKR) / paper OCO
    stop_loss: float | None = None  # protective stop held at the broker
    purpose: Purpose = Purpose.ENTRY
    client_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    reference_price: float | None = None  # price used for risk sizing
    leverage: float = 1.0  # account leverage of the position this order opens/closes
    approval: Any = None  # set by RiskManager only

    @property
    def opens(self) -> bool:
        return self.purpose == Purpose.ENTRY

    @property
    def position_side(self) -> PositionSide:
        """Side of the position this order opens (entries) or closes (exits)."""
        if self.opens:
            return PositionSide.LONG if self.side == Side.BUY else PositionSide.SHORT
        return PositionSide.LONG if self.side == Side.SELL else PositionSide.SHORT

    def notional(self, price: float | None = None) -> float:
        p = price or self.limit_price or self.reference_price or self.stop_price or 0.0
        return self.qty * p


@dataclass
class Order:
    id: str
    client_id: str
    symbol: str
    side: Side
    qty: float
    order_type: OrderType
    status: OrderStatus
    limit_price: float | None = None
    stop_price: float | None = None
    filled_qty: float = 0.0
    avg_fill_price: float = 0.0
    fee: float = 0.0
    purpose: Purpose = Purpose.ENTRY
    parent_id: str | None = None
    oco_group: str | None = None
    reason: str = ""
    created_at: datetime = field(default_factory=utcnow)

    @property
    def is_open(self) -> bool:
        return self.status in (OrderStatus.PENDING, OrderStatus.OPEN)


@dataclass(frozen=True)
class Fill:
    order_id: str
    client_id: str
    symbol: str
    side: Side
    qty: float
    price: float
    fee: float
    purpose: Purpose
    ts: datetime = field(default_factory=utcnow)


QuoteCallback = Callable[[Quote], Awaitable[None] | None]


class BrokerAdapter(ABC):
    """Interface implemented by every broker adapter."""

    broker: Broker

    @property
    @abstractmethod
    def mode(self) -> Mode: ...

    @abstractmethod
    async def connect(self) -> None: ...

    async def close(self) -> None:  # pragma: no cover - optional
        return None

    @property
    def connected(self) -> bool:
        return True

    @abstractmethod
    async def get_balances(self) -> dict[str, Balance]: ...

    @abstractmethod
    async def get_positions(self) -> dict[str, Position]: ...

    @abstractmethod
    async def get_quote(self, symbol: str) -> Quote: ...

    @abstractmethod
    async def get_orderbook(self, symbol: str, depth: int = 10) -> OrderBook: ...

    @abstractmethod
    async def place_order(self, req: OrderRequest) -> Order: ...

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool: ...

    @abstractmethod
    async def get_open_orders(self) -> list[Order]: ...

    @abstractmethod
    async def get_fees(self, symbol: str) -> Fees: ...

    @abstractmethod
    async def is_market_open(self, symbol: str, now: datetime | None = None) -> bool: ...

    @abstractmethod
    async def stream(self, symbols: list[str], callback: QuoteCallback) -> None: ...

    # ------------------------------------------------------------------ extras used by the engine

    @abstractmethod
    async def get_rules(self, symbol: str) -> InstrumentRules: ...

    @abstractmethod
    async def get_bars(self, symbol: str, limit: int = 200) -> list[Bar]: ...

    @abstractmethod
    async def list_symbols(self) -> list[str]: ...

    @abstractmethod
    async def get_equity(self) -> tuple[float, float]:
        """Return (equity_eur, cash_eur)."""

    async def fx_to_eur(self, currency: str) -> float:
        return 1.0

    def fx_rate(self, currency: str) -> float:
        """Last known currency -> EUR rate, without network (for the UI and the paper engine)."""
        return 1.0

    async def poll_fills(self) -> list[Fill]:
        """Fills since the last call (used to keep positions in sync)."""
        return []
