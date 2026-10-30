"""Wires everything together: config, storage, mode switch, risk, adapters, traders."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from tradebot.agents.pool import AgentPool
from tradebot.backtest.runner import Backtester
from tradebot.brokers.base import Broker, BrokerAdapter, BrokerError, Mode
from tradebot.brokers.ibkr import IBKRAdapter
from tradebot.brokers.kraken import KrakenAdapter
from tradebot.data.amf import AmfClient
from tradebot.data.cache import BarCache, PoliteHttp
from tradebot.data.edgar import EdgarClient
from tradebot.data.kraken_feed import KrakenFeed
from tradebot.data.onchain import OnchainClient
from tradebot.engine.mode import LivePreconditions, ModeSwitch, confirm_phrase
from tradebot.engine.risk import RiskManager
from tradebot.engine.snapshots import DataHub
from tradebot.engine.trader import BrokerTrader
from tradebot.logging_setup import set_mode_provider, setup_logging
from tradebot.settings import AppConfig, Secrets, config_dir, home_dir, load_config
from tradebot.storage.db import Database

log = logging.getLogger(__name__)

KILL_TIMEOUT_SECONDS = 30


class Bot:
    def __init__(self, home: Path | None = None, cfg_dir: Path | None = None, isolated_agents: bool = True,
                 console_log: bool = False, db: Database | None = None,
                 adapters: Callable[[ModeSwitch], dict[Broker, BrokerAdapter]] | None = None,
                 secrets: Secrets | None = None,
                 config: AppConfig | None = None):
        self.home = home or home_dir()
        self.cfg_dir = cfg_dir or config_dir()
        self.secrets = secrets or Secrets.load(self.home / ".env")
        setup_logging(self.home / "logs", self.secrets.secret_values(), console=console_log)
        self.cfg = config or load_config(self.cfg_dir)
        self.db = db or Database(self.home / "data" / "bot.db")

        # test mode is ON for every broker at every start
        self.mode = ModeSwitch(tuple(Broker), recorder=self.db.record_mode_change)
        set_mode_provider(self.mode.snapshot)
        self.risk = RiskManager(self.cfg.risk, on_event=self.db.record_risk_event, mode_of=self.mode.mode)
        self.bar_cache = BarCache(self.db)

        d = self.cfg.strategy.data
        ua = self.secrets.edgar_user_agent or "tradebot-local-research contact@example.com"
        self._http = [
            PoliteHttp(self.db, "etherscan", d.etherscan_min_interval_seconds),
            PoliteHttp(self.db, "mempool", 0.5),
            PoliteHttp(self.db, "sec", d.edgar_min_interval_seconds, headers={"User-Agent": ua}),
            PoliteHttp(self.db, "amf", d.amf_min_interval_seconds),
        ]
        eth_key = self.secrets.etherscan_api_key.get_secret_value() if self.secrets.etherscan_api_key else None
        onchain = OnchainClient(self.cfg.wallet_labels, self._http[0], self._http[1], eth_key, self.db,
                                self.cfg.strategy.kraken.agents.smart_money.snapshot_minutes)
        self.data = DataHub(self.cfg, onchain, EdgarClient(self._http[2]), AmfClient(self._http[3], d.amf_api))

        if adapters is not None:
            self.adapters = adapters(self.mode)
        else:
            kraken = KrakenAdapter(self.cfg.strategy.kraken, self.secrets, self.mode, db=self.db,
                                   feed=KrakenFeed(self.bar_cache),
                                   paper_cash=self.cfg.strategy.paper_starting_balance_eur.get("kraken", 1000.0))
            ibkr = IBKRAdapter(self.cfg.strategy.ibkr, self.cfg.universe_ibkr, self.mode, self.secrets,
                               bar_cache=self.bar_cache)
            self.adapters = {Broker.KRAKEN: kraken, Broker.IBKR: ibkr}
        self.agents = AgentPool(isolated=isolated_agents)
        self.traders = {b: BrokerTrader(b, a, self.cfg, self.risk, self.mode, self.db, self.agents, self.data)
                        for b, a in self.adapters.items()}
        kraken_adapter = self.adapters.get(Broker.KRAKEN)
        probe = getattr(kraken_adapter, "withdrawal_enabled", None)
        self.preconditions = LivePreconditions(self.db, self.secrets, self.risk, withdrawal_probe=probe)

    # ------------------------------------------------------------------ helpers

    def brokers(self, which: str | None) -> list[Broker]:
        if which in (None, "", "all"):
            return list(self.adapters)
        try:
            b = Broker(which.lower())
        except ValueError as exc:
            raise ValueError(f"unknown broker '{which}' (kraken|ibkr|all)") from exc
        if b not in self.adapters:
            raise ValueError(f"broker {b} not configured")
        return [b]

    def broker_for_symbol(self, symbol: str) -> Broker:
        return Broker.KRAKEN if "/" in symbol else Broker.IBKR

    async def ensure_connected(self, broker: Broker) -> None:
        a = self.adapters[broker]
        if not a.connected:
            await a.connect()

    # ------------------------------------------------------------------ actions

    async def start(self, which: str | None) -> list[str]:
        out = []
        for b in self.brokers(which):
            try:
                await self.traders[b].start()
                out.append(f"{b}: started in {self.mode.mode(b).value.upper()} mode")
            except Exception as exc:  # noqa: BLE001
                out.append(f"{b}: could not start ({type(exc).__name__}: {exc})")
        return out

    def stop(self, which: str | None) -> list[str]:
        out = []
        for b in self.brokers(which):
            self.traders[b].stop_entries()
            out.append(f"{b}: new entries stopped, open positions still managed")
        return out

    async def kill(self) -> list[str]:
        """Cancel all orders, close all positions, set every broker to test mode (<= 30 s)."""
        report: list[str] = []

        async def one(b: Broker) -> list[str]:
            if not self.adapters[b].connected:
                try:
                    await self.adapters[b].connect()
                except Exception as exc:  # noqa: BLE001
                    return [f"{b}: not connected ({exc})"]
            return [f"{b}: {line}" for line in await self.traders[b].kill()]

        try:
            results = await asyncio.wait_for(asyncio.gather(*(one(b) for b in self.adapters)),
                                             timeout=KILL_TIMEOUT_SECONDS)
            for r in results:
                report += r
        except asyncio.TimeoutError:
            report.append(f"kill: timed out after {KILL_TIMEOUT_SECONDS}s — check the brokers manually")
        finally:
            self.mode.all_to_test("kill switch", "operator")
        report.append("all brokers set to TEST mode")
        return report

    async def live_summary(self, broker: Broker) -> tuple[list, str]:
        pre = await self.preconditions.check(broker)
        cfg = self.risk.cfg(broker)
        lines = [f"== live on {broker} ==", "Active risk limits:"]
        lines += [f"  {k}: {v}" for k, v in cfg.model_dump().items()]
        closed = self.db.closed_positions(broker, Mode.TEST)
        pnl = sum(p.pnl or 0 for p in closed)
        wins = sum(1 for p in closed if (p.pnl or 0) > 0)
        lines.append(f"Paper results: {len(closed)} closed trades, P&L {pnl:+.2f} EUR, "
                     f"win rate {wins / len(closed) * 100 if closed else 0:.1f}%, "
                     f"fees {self.db.fees_paid(broker, Mode.TEST):.2f} EUR")
        if cfg.allow_short or cfg.max_leverage > 1:
            lines.append(f"WARNING: shorts={'on' if cfg.allow_short else 'off'}, max leverage {cfg.max_leverage}x. "
                         "This needs a margin-enabled account (Kraken margin / IBKR margin account). "
                         "Losses can exceed the capital of a position; stops can slip in fast markets.")
        lines.append("Preconditions:")
        lines += [f"  [{'x' if p.ok else ' '}] {p.name}: {p.detail}" for p in pre]
        return pre, "\n".join(lines)

    async def go_live(self, broker: Broker, phrase: str) -> str:
        pre = await self.preconditions.check(broker)  # re-check at confirmation time
        ok, msg = self.mode.request_live(broker, phrase, pre)
        return msg

    def live_off(self, broker: Broker) -> str:
        self.mode.set_test(broker, "operator: live off")
        return f"{broker}: TEST mode (live positions, if any, keep their broker-side stop-loss)"

    def reload_config(self) -> str:
        new = load_config(self.cfg_dir)
        self.cfg.strategy, self.cfg.universe_ibkr, self.cfg.wallet_labels = new.strategy, new.universe_ibkr, new.wallet_labels
        self.cfg.risk = new.risk
        self.risk.config = new.risk
        for b, a in self.adapters.items():
            if hasattr(a, "cfg"):
                a.cfg = getattr(new.strategy, str(b))
            if isinstance(a, IBKRAdapter):
                a.universe = new.universe_ibkr
        log.info("configuration reloaded")
        return "configuration reloaded (risk limits reset to risk.yaml values)"

    # ------------------------------------------------------------------ backtest

    async def backtest(self, broker: Broker, start: datetime, end: datetime) -> str:
        if broker == Broker.KRAKEN:
            interval_min = self.cfg.strategy.kraken.bars.interval_minutes
            key = f"{interval_min}m"
            interval = timedelta(minutes=interval_min)
            symbols = self.bar_cache.symbols("kraken", key)
            if not symbols:
                await self._fetch_kraken_history()
                symbols = self.bar_cache.symbols("kraken", key)
        else:
            key = self.cfg.strategy.ibkr.bars.bar_size
            interval = timedelta(days=1) if "day" in key else timedelta(minutes=int(key.split()[0]))
            symbols = [s for s in self.bar_cache.symbols("ibkr", key) if self.cfg.universe_ibkr.entry(s)]
        bars = {s: self.bar_cache.get(str(broker), s, key, start - timedelta(days=60), end) for s in symbols}
        bars = {s: b for s, b in bars.items() if b}
        if not bars:
            return (f"no cached {key} bars for {broker}: run the bot (or `scan {broker}`) so data is cached first"
                    + (" — IBKR history needs the paper Gateway running" if broker == Broker.IBKR else ""))
        bt = Backtester(self.cfg, broker, bars, interval)
        result = await asyncio.to_thread(bt.run, start, end)
        _, wf = await asyncio.to_thread(bt.walk_forward, start, end)
        return result.report() + "\n\n" + wf

    async def _fetch_kraken_history(self) -> None:
        kraken = self.adapters[Broker.KRAKEN]
        await self.ensure_connected(Broker.KRAKEN)
        q = self.cfg.strategy.kraken.quote_currency
        syms = self.cfg.strategy.kraken.scanner.include_only or [f"{b}/{q}" for b in ("BTC", "ETH", "SOL", "XRP")]
        extra = self.data.kraken_related_symbols(syms, kraken.has_pair)
        for s in [x for x in syms + extra if kraken.has_pair(x)]:
            try:
                await kraken.get_bars(s, 720)
            except BrokerError as exc:
                log.warning("history fetch failed for %s: %s", s, exc)

    # ------------------------------------------------------------------ shutdown

    async def shutdown(self) -> None:
        for t in self.traders.values():
            await t.shutdown()
        for a in self.adapters.values():
            try:
                await a.close()
            except Exception:  # noqa: BLE001
                pass
        for h in self._http:
            await h.close()
        self.agents.shutdown()


def utc_date(s: str) -> datetime:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)


__all__ = ["Bot", "confirm_phrase", "utc_date"]
