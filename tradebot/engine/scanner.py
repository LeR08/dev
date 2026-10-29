"""Scanner: shrinks the universe every cycle and records why instruments are rejected."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from tradebot.brokers.base import Broker, OrderBook, Quote, Side, utcnow
from tradebot.settings import IBKRScannerCfg, KrakenScannerCfg


@dataclass(frozen=True)
class InstrumentSnapshot:
    symbol: str
    quote: Quote | None
    book: OrderBook | None = None
    avg_daily_volume: float | None = None
    session: tuple[datetime, datetime] | None = None  # current/next exchange session (IBKR)
    market_open: bool = True
    earnings_dates: frozenset[date] = frozenset()


@dataclass
class ScanResult:
    broker: str
    ts: datetime
    scanned: int
    passed: list[str] = field(default_factory=list)
    rejected: dict[str, str] = field(default_factory=dict)

    @property
    def pass_rate(self) -> float:
        return len(self.passed) / self.scanned if self.scanned else 0.0

    def top_reasons(self, n: int = 3) -> list[tuple[str, int]]:
        return Counter(r.split(":")[0] for r in self.rejected.values()).most_common(n)


STABLECOINS = {"USDT", "USDC", "DAI", "EURC", "EUROP", "EURQ", "EURR", "EURT", "USD1", "USDE", "USDG", "USDS",
               "USDQ", "USDR", "USDP", "USDPT", "PYUSD", "TUSD", "FDUSD", "RLUSD", "GHO", "FRAX", "LUSD", "CASH",
               "FIDD", "FRNT", "SOFID", "PAXG", "XAUT", "USD", "EUR", "GBP", "CHF", "AUD", "CAD", "JPY"}
_FIAT_LIKE = re.compile(r"^(USD|EUR|GBP)|(USD|EUR)$")


def is_stablecoin(symbol: str) -> bool:
    """Fiat-pegged tokens (and gold tokens) trade in a tiny range: not worth a mean-reversion trade."""
    base = symbol.split("/")[0].upper()
    return base in STABLECOINS or bool(_FIAT_LIKE.search(base))


class Scanner:
    def __init__(self, broker: Broker, cfg: KrakenScannerCfg | IBKRScannerCfg):
        self.broker = Broker(broker)
        self.cfg = cfg

    def scan(self, snaps: list[InstrumentSnapshot], now: datetime | None = None) -> ScanResult:
        now = now or utcnow()
        res = ScanResult(str(self.broker), now, len(snaps))
        for s in snaps:
            reason = self._reject_reason(s, now)
            if reason:
                res.rejected[s.symbol] = reason
            else:
                res.passed.append(s.symbol)
        return res

    def _reject_reason(self, s: InstrumentSnapshot, now: datetime) -> str | None:
        cfg = self.cfg
        if s.quote is None or s.quote.bid <= 0 or s.quote.ask <= 0:
            return "no_quote"
        if s.quote.spread_bps > cfg.max_spread_bps:
            return f"spread: {s.quote.spread_bps:.1f} bps > {cfg.max_spread_bps}"
        if isinstance(cfg, KrakenScannerCfg):
            if cfg.include_only and s.symbol not in cfg.include_only:
                return "excluded: not in include_only"
            if s.symbol in cfg.exclude:
                return "excluded: config"
            if cfg.exclude_stablecoins and is_stablecoin(s.symbol):
                return "excluded: stablecoin"
            if s.book is None:
                return "depth: no order book"
            depth = min(s.book.depth_notional(Side.BUY, cfg.depth_levels),
                        s.book.depth_notional(Side.SELL, cfg.depth_levels))
            if depth < cfg.min_depth_eur:
                return f"depth: {depth:,.0f} < {cfg.min_depth_eur:,.0f}"
            if now.hour in cfg.low_liquidity_hours_utc:
                return f"time_window: low-liquidity hour {now.hour}h UTC"
        else:
            if s.avg_daily_volume is None or s.avg_daily_volume < cfg.min_avg_daily_volume:
                return f"volume: ADV {s.avg_daily_volume or 0:,.0f} < {cfg.min_avg_daily_volume:,.0f}"
            if not s.market_open or s.session is None:
                return "time_window: market closed"
            start, end = s.session
            edge = timedelta(minutes=cfg.avoid_open_close_minutes)
            if now < start + edge:
                return f"time_window: first {cfg.avoid_open_close_minutes} min of session"
            if now > end - edge:
                return f"time_window: last {cfg.avoid_open_close_minutes} min of session"
            if cfg.avoid_earnings_days and now.date() in s.earnings_dates:
                return "earnings: earnings day"
        return None
