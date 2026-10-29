"""Agent data types: read-only snapshots in, votes out (all picklable)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from tradebot.brokers.base import Bar, Quote


class Direction(StrEnum):
    LONG = "LONG"
    SHORT = "SHORT"
    NONE = "NONE"
    AVOID = "AVOID"  # blocks any trade in either direction


@dataclass(frozen=True)
class Vote:
    agent: str
    direction: Direction
    confidence: float
    reason: str
    target_price: float | None = None

    @classmethod
    def none(cls, agent: str, reason: str) -> "Vote":
        return cls(agent, Direction.NONE, 0.0, reason)


@dataclass(frozen=True)
class OnchainFlow:
    asset: str
    inflow: float  # to labelled exchange wallets (asset units)
    outflow: float  # from labelled exchange wallets
    window_hours: int
    price_eur: float
    n_in: int = 0
    n_out: int = 0
    exchange_balance: float | None = None  # total held by the labelled exchange wallets (asset units)

    @property
    def net_outflow_eur(self) -> float:
        return (self.outflow - self.inflow) * self.price_eur

    @property
    def net_outflow_pct(self) -> float | None:
        """Net outflow as % of exchange balance (positive = coins leaving exchanges)."""
        if not self.exchange_balance:
            return None
        return (self.outflow - self.inflow) / self.exchange_balance * 100


@dataclass(frozen=True)
class InsiderTxn:
    date: datetime
    insider: str
    side: str  # "buy" / "sell"
    shares: float
    price: float
    planned: bool = False  # e.g. SEC Rule 10b5-1 plan
    source: str = "sec"

    @property
    def value(self) -> float:
        return self.shares * self.price


@dataclass(frozen=True)
class InsiderActivity:
    window_days: int
    txns: tuple[InsiderTxn, ...] = ()
    institutional_change_pct: float | None = None  # 13F quarter-over-quarter change


@dataclass(frozen=True)
class Snapshot:
    broker: str
    symbol: str
    ts: datetime
    bars: tuple[Bar, ...]
    quote: Quote | None = None
    related_quotes: dict[str, Quote] = field(default_factory=dict)
    related_bars: dict[str, tuple[Bar, ...]] = field(default_factory=dict)
    pair_partners: tuple[str, ...] = ()
    onchain: OnchainFlow | None = None
    market_flow: OnchainFlow | None = None  # stablecoins on exchanges (market-wide buying power)
    insider: InsiderActivity | None = None
    taker_fee: float = 0.0026
    data_delay_minutes: int = 0
