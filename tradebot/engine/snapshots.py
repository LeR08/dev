"""Builds the read-only snapshots given to agents (market data + free alt-data)."""

from __future__ import annotations

import logging
import time
from datetime import datetime

from tradebot.agents.base import InsiderActivity, OnchainFlow, Snapshot
from tradebot.brokers.base import Broker, Quote, utcnow
from tradebot.settings import AppConfig

log = logging.getLogger(__name__)


class DataHub:
    def __init__(self, cfg: AppConfig, onchain=None, edgar=None, amf=None, clock=utcnow):
        self.cfg = cfg
        self.onchain = onchain
        self.edgar = edgar
        self.amf = amf
        self.clock = clock
        self._quotes: dict[str, Quote] = {}
        self._onchain_cache: dict[str, tuple[float, OnchainFlow | None]] = {}
        self._insider_cache: dict[str, tuple[float, InsiderActivity | None]] = {}

    # ------------------------------------------------------------------ kraken

    def set_quotes(self, quotes: dict[str, Quote]) -> None:
        self._quotes.update(quotes)

    def kraken_related_symbols(self, symbols: list[str], has_pair) -> list[str]:
        bridges = self.cfg.strategy.kraken.agents.arbitrage.bridges
        quote_ccy = self.cfg.strategy.kraken.quote_currency
        out = set()
        for s in symbols:
            base = s.split("/")[0]
            for b in bridges:
                for cand in (f"{base}/{b}", f"{b}/{base}", f"{b}/{quote_ccy}"):
                    if b != base and has_pair(cand):
                        out.add(cand)
        return sorted(out)

    async def _onchain_flow(self, asset: str, price_eur: float) -> OnchainFlow | None:
        sm = self.cfg.strategy.kraken.agents.smart_money
        if self.onchain is None or not sm.enabled:
            return None
        hit = self._onchain_cache.get(asset)
        if hit and time.monotonic() - hit[0] < 300:
            return hit[1]
        try:
            flow = await self.onchain.flows(asset, price_eur, sm.window_hours, sm.min_tx_eur, sm.erc20, self.clock())
        except Exception as exc:  # noqa: BLE001
            log.warning("on-chain data unavailable for %s: %s", asset, type(exc).__name__, extra={"broker": "kraken"})
            flow = None
        self._onchain_cache[asset] = (time.monotonic(), flow)
        return flow

    async def kraken_snapshot(self, adapter, symbol: str, taker_fee: float) -> Snapshot:
        bars = await adapter.get_bars(symbol, self.cfg.strategy.kraken.bars.lookback)
        quote = self._quotes.get(symbol) or await adapter.get_quote(symbol)
        base = symbol.split("/")[0]
        bridges = self.cfg.strategy.kraken.agents.arbitrage.bridges
        related = {s: q for s, q in self._quotes.items()
                   if base in s.split("/") or s.split("/")[0] in bridges}
        flow = await self._onchain_flow(base, quote.mid)
        return Snapshot(broker="kraken", symbol=symbol, ts=self.clock(), bars=tuple(bars), quote=quote,
                        related_quotes=related, onchain=flow, taker_fee=taker_fee)

    # ------------------------------------------------------------------ ibkr

    async def _insider(self, symbol: str, now: datetime) -> InsiderActivity | None:
        sm = self.cfg.strategy.ibkr.agents.smart_money
        if not sm.enabled:
            return None
        hit = self._insider_cache.get(symbol)
        if hit and time.monotonic() - hit[0] < 3600:
            return hit[1]
        entry = self.cfg.universe_ibkr.entry(symbol)
        act = None
        try:
            if entry and entry.amf_jeton and self.amf is not None:
                act = await self.amf.activity(entry.amf_jeton, sm.window_days, now)
            elif entry and entry.currency == "USD" and self.edgar is not None:
                act = await self.edgar.activity(symbol, sm.window_days, entry.cusip, sm.institutions_13f, now)
        except Exception as exc:  # noqa: BLE001
            log.warning("insider data unavailable for %s: %s", symbol, type(exc).__name__, extra={"broker": "ibkr"})
        self._insider_cache[symbol] = (time.monotonic(), act)
        return act

    def pair_partners(self, symbol: str) -> tuple[str, ...]:
        out = []
        for a, b in self.cfg.universe_ibkr.pairs:
            if a == symbol:
                out.append(b)
            elif b == symbol:
                out.append(a)
        return tuple(out)

    async def ibkr_snapshot(self, adapter, symbol: str, quote: Quote | None) -> Snapshot:
        lookback = max(self.cfg.strategy.ibkr.agents.arbitrage.lookback,
                       self.cfg.strategy.ibkr.agents.convergence.window) + 30
        bars = await adapter.get_bars(symbol, lookback)
        partners = self.pair_partners(symbol)
        related = {}
        for p in partners:
            try:
                related[p] = tuple(await adapter.get_bars(p, lookback))
            except Exception as exc:  # noqa: BLE001
                log.warning("bars unavailable for pair leg %s: %s", p, exc, extra={"broker": "ibkr"})
        now = self.clock()
        return Snapshot(broker=str(Broker.IBKR), symbol=symbol, ts=now, bars=tuple(bars), quote=quote,
                        related_bars=related, pair_partners=partners, insider=await self._insider(symbol, now),
                        data_delay_minutes=self.cfg.strategy.ibkr.data_delay_minutes)

    async def snapshot(self, broker: Broker, adapter, symbol: str, quote: Quote | None = None,
                       taker_fee: float = 0.004) -> Snapshot:
        if broker == Broker.KRAKEN:
            return await self.kraken_snapshot(adapter, symbol, taker_fee)
        return await self.ibkr_snapshot(adapter, symbol, quote)
