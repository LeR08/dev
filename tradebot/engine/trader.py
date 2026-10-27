"""Per-broker trading loop: scan -> agents -> consensus -> risk -> mode-aware adapter.

The loop also keeps positions in sync with fills, runs the exit rules, enforces
account-level risk limits (with automatic fallback to test mode) and provides
the kill switch.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from tradebot.agents.base import Vote
from tradebot.agents.pool import AgentPool
from tradebot.brokers.base import (
    Broker,
    BrokerAdapter,
    BrokerError,
    Fill,
    MarketClosed,
    Mode,
    Order,
    OrderRejected,
    OrderRequest,
    OrderType,
    Purpose,
    Quote,
    Side,
    utcnow,
)
from tradebot.engine.consensus import ConsensusDecision, decide
from tradebot.engine.exits import ExitManager, ExitReason, PositionView, take_profit_price
from tradebot.engine.mode import ModeSwitch
from tradebot.engine.risk import AccountState, PositionInfo, RiskEvent, RiskEventKind, RiskManager
from tradebot.engine.scanner import InstrumentSnapshot, Scanner, ScanResult
from tradebot.engine.snapshots import DataHub
from tradebot.settings import AppConfig
from tradebot.storage.db import Database, as_utc

log = logging.getLogger(__name__)


@dataclass
class PendingEntry:
    order_id: str
    symbol: str
    created: datetime
    decision: ConsensusDecision
    stop_loss: float | None
    take_profit: float | None
    value_eur: float = 0.0


@dataclass
class PendingExit:
    order_id: str
    position_id: int
    symbol: str
    reason: str
    created: datetime
    market_fallback_done: bool = False


@dataclass
class VoteRecord:
    ts: datetime
    decision: ConsensusDecision
    votes: list[Vote]


@dataclass
class TraderState:
    day: date | None = None
    day_start_equity: float | None = None
    peak_equity: float | None = None
    equity: float = 0.0
    cash: float = 0.0
    daily_pnl: float = 0.0
    last_error: str | None = None
    flags: dict[str, str] = field(default_factory=dict)


class BrokerTrader:
    def __init__(self, broker: Broker, adapter: BrokerAdapter, cfg: AppConfig, risk: RiskManager,
                 mode: ModeSwitch, db: Database, agents: AgentPool, data: DataHub, clock=utcnow):
        self.broker = Broker(broker)
        self.adapter = adapter
        self.cfg = cfg
        self.risk = risk
        self.mode_switch = mode
        self.db = db
        self.agents = agents
        self.data = data
        self.clock = clock
        self.exits = ExitManager(cfg.strategy.exits, str(self.broker))
        self.running = False
        self.entries_enabled = False
        self.last_scan: ScanResult | None = None
        self.last_votes: dict[str, VoteRecord] = {}
        self.states: dict[Mode, TraderState] = {Mode.TEST: TraderState(), Mode.LIVE: TraderState()}
        self._pending_entries: dict[str, PendingEntry] = {}
        self._pending_exits: dict[str, PendingExit] = {}
        self._task: asyncio.Task | None = None
        self._lock = asyncio.Lock()
        self.log = logging.LoggerAdapter(log, {"broker": str(self.broker)})
        mode.add_listener(self._on_mode_change)

    # ------------------------------------------------------------------ config shortcuts

    @property
    def mode(self) -> Mode:
        return self.mode_switch.mode(self.broker)

    @property
    def state(self) -> TraderState:
        return self.states[self.mode]

    @property
    def bcfg(self):
        return getattr(self.cfg.strategy, str(self.broker))

    @property
    def scanner(self) -> Scanner:
        return Scanner(self.broker, self.bcfg.scanner)

    def agent_cfgs(self) -> dict[str, dict]:
        return self.bcfg.agents.model_dump()

    def _on_mode_change(self, broker: Broker, mode: Mode, reason: str) -> None:
        if broker == self.broker:
            # orders/pending state belong to the previous mode; positions are kept per mode in the DB
            self._pending_entries.clear()
            self._pending_exits.clear()

    # ------------------------------------------------------------------ lifecycle

    async def start(self) -> None:
        if self.running:
            return
        if not self.adapter.connected:
            await self.adapter.connect()
        self.running = True
        self.entries_enabled = True
        self._task = asyncio.create_task(self._run(), name=f"trader-{self.broker}")
        self.log.info("trading loop started (%s mode)", self.mode)

    def stop_entries(self) -> None:
        """``stop``: no new entries; open positions are still managed."""
        self.entries_enabled = False
        self.log.info("new entries stopped; still managing open positions")

    async def shutdown(self) -> None:
        self.running = False
        self.entries_enabled = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass

    async def _run(self) -> None:
        interval = float(self.cfg.strategy.cycle_seconds.get(str(self.broker), 60))
        while self.running:
            started = asyncio.get_running_loop().time()
            try:
                await self.cycle()
                self.state.last_error = None
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                self.state.last_error = f"{type(exc).__name__}: {exc}"
                self.log.exception("cycle failed")
            elapsed = asyncio.get_running_loop().time() - started
            await asyncio.sleep(max(1.0, interval - elapsed))

    async def cycle(self) -> None:
        async with self._lock:
            await self.sync_fills()
            acct = await self.account_state()
            self._record_equity(acct)
            events = self.risk.evaluate_account(self.broker, acct)
            if events:
                await self.handle_limit_events(events)
                return
            await self.manage_pending()
            await self.manage_exits()
            if self.entries_enabled and self.risk.halt_reason(self.broker) is None:
                scan = await self.scan(record=True)
                for symbol in scan.passed:
                    if not self.entries_enabled:
                        break
                    acct = await self.account_state()
                    await self.evaluate_entry(symbol, acct)

    # ------------------------------------------------------------------ account

    async def _quotes(self, symbols: list[str]) -> dict[str, Quote]:
        if not symbols:
            return {}
        getter = getattr(self.adapter, "get_quotes", None)
        if getter:
            return await getter(symbols)
        out = {}
        for s in symbols:
            try:
                out[s] = await self.adapter.get_quote(s)
            except BrokerError:
                pass
        return out

    async def account_state(self) -> AccountState:
        mode = self.mode
        equity, cash = await self.adapter.get_equity()
        positions = self.db.open_positions(self.broker, mode)
        quotes = await self._quotes([p.symbol for p in positions])
        infos: dict[str, PositionInfo] = {}
        unrealized = 0.0
        for p in positions:
            fx = await self.adapter.fx_to_eur(p.currency)
            price = quotes[p.symbol].bid if p.symbol in quotes and quotes[p.symbol].bid > 0 else p.entry_price
            infos[p.symbol] = PositionInfo(p.qty, p.qty * price * fx)
            unrealized += (price - p.entry_price) * p.qty * fx
        if self.broker == Broker.IBKR and mode == Mode.TEST:
            # IBKR paper accounts hold large simulated balances: cap to the configured paper balance
            virtual = self.cfg.strategy.paper_starting_balance_eur.get("ibkr", 1000.0) + \
                self.db.realized_pnl(self.broker, Mode.TEST) + unrealized
            exposure = sum(i.value_eur for i in infos.values())
            equity, cash = min(equity, virtual), max(0.0, min(cash, virtual - exposure))
        st = self.state
        today = self.clock().date()
        if st.day != today:
            st.day, st.day_start_equity = today, equity
        st.peak_equity = max(st.peak_equity or equity, equity, self._db_peak(mode))
        st.equity, st.cash = equity, cash
        st.daily_pnl = equity - (st.day_start_equity or equity)
        open_entries = list(self._pending_entries.values())
        return AccountState(broker=self.broker, mode=mode, equity=equity, cash=cash, positions=infos,
                            open_entry_value=sum(pe.value_eur for pe in open_entries),
                            open_entry_count=len(open_entries),
                            day_start_equity=st.day_start_equity, peak_equity=st.peak_equity)

    def _db_peak(self, mode: Mode) -> float:
        curve = self.db.equity_curve(self.broker, mode)
        return max((e.equity for e in curve), default=0.0)

    def _record_equity(self, acct: AccountState) -> None:
        self.db.record_equity(self.broker, acct.mode, acct.equity, acct.cash, acct.exposure, self.state.daily_pnl)

    # ------------------------------------------------------------------ scanning

    async def scan(self, record: bool = False) -> ScanResult:
        symbols = await self.adapter.list_symbols()
        now = self.clock()
        snaps: list[InstrumentSnapshot] = []
        if self.broker == Broker.KRAKEN:
            related = self.data.kraken_related_symbols(symbols, self.adapter.has_pair)
            quotes = await self._quotes(sorted(set(symbols) | set(related)))
            self.data.set_quotes(quotes)
            sc = self.bcfg.scanner
            for s in symbols:
                q = quotes.get(s)
                book = None
                prefilter_ok = q is not None and q.spread_bps <= sc.max_spread_bps and \
                    (not sc.include_only or s in sc.include_only) and s not in sc.exclude
                if prefilter_ok:
                    try:
                        book = await self.adapter.get_orderbook(s, sc.depth_levels)
                    except BrokerError:
                        book = None
                snaps.append(InstrumentSnapshot(s, q, book))
        else:
            for s in symbols:
                entry = self.cfg.universe_ibkr.entry(s)
                try:
                    q = await self.adapter.get_quote(s)
                    sess = await self.adapter.current_session(s, now)
                    adv = await self.adapter.avg_daily_volume(s)
                except BrokerError as exc:
                    self.log.warning("scan: %s unavailable (%s)", s, exc)
                    q, sess, adv = None, None, None
                earnings = frozenset(date.fromisoformat(d) for d in (entry.earnings_dates if entry else []))
                snaps.append(InstrumentSnapshot(s, q, None, adv, sess, sess is not None, earnings))
                if q:
                    self.data.set_quotes({s: q})
        result = self.scanner.scan(snaps, now)
        self.last_scan = result
        if record:
            self.db.record_scan(self.broker, self.mode, result)
        self.log.info("scan: %d scanned, %d passed (%.0f%%), top rejections %s", result.scanned,
                      len(result.passed), result.pass_rate * 100, result.top_reasons())
        return result

    # ------------------------------------------------------------------ voting / entries

    async def votes_for(self, symbol: str) -> tuple[ConsensusDecision, list[Vote]]:
        fees = await self.adapter.get_fees(symbol)
        quote = self.data._quotes.get(symbol)
        if quote is None:
            wanted = [symbol]
            if self.broker == Broker.KRAKEN:  # cross pairs for the triangle check
                wanted += self.data.kraken_related_symbols([symbol], self.adapter.has_pair)
            self.data.set_quotes(await self._quotes(wanted))
            quote = self.data._quotes.get(symbol) or await self.adapter.get_quote(symbol)
        snap = await self.data.snapshot(self.broker, self.adapter, symbol, quote, fees.taker)
        votes = await self.agents.votes(snap, self.agent_cfgs())
        decision = decide(votes, self.cfg.strategy.consensus)
        self.last_votes[symbol] = VoteRecord(self.clock(), decision, votes)
        return decision, votes

    async def evaluate_entry(self, symbol: str, acct: AccountState) -> None:
        if symbol in acct.positions or any(p.symbol == symbol for p in self._pending_entries.values()):
            return
        decision, votes = await self.votes_for(symbol)
        dec_id = self.db.record_decision(self.broker, self.mode, symbol, decision, votes)
        if not decision.trade:
            return
        quote = self.data._quotes[symbol]
        rules = await self.adapter.get_rules(symbol)
        fx = await self.adapter.fx_to_eur(rules.currency)
        if self.broker == Broker.KRAKEN:
            price = quote.bid  # resting at the bid: post-only maker order
        else:
            price = rules.round_price(quote.mid, Side.BUY)  # delayed data: limit at mid, never chase
        if price <= 0:
            self.db.update_decision(dec_id, "refused: no price", None)
            return
        tp = take_profit_price(price, decision.target_price, self.cfg.strategy.exits.take_profit_fraction)
        rcfg = self.risk.cfg(self.broker)
        pct = rcfg.max_position_pct_full if decision.size_factor >= 1 else rcfg.max_position_pct_half
        qty = rules.round_qty(self.risk.capital(self.broker, acct) * pct / 100 / (price * fx))
        req = OrderRequest(symbol, Side.BUY, qty, OrderType.LIMIT, limit_price=price,
                           post_only=self.broker == Broker.KRAKEN,
                           take_profit=tp if self.broker == Broker.IBKR else None,
                           reference_price=price, purpose=Purpose.ENTRY)
        acct.fx = fx
        rd = self.risk.approve(self.broker, req, acct, rules, decision.size_factor)
        self.db.update_decision(dec_id, rd.reason if rd.approved else f"refused: {rd.reason}",
                                rd.request.client_id if rd.request else None)
        if not rd.approved:
            self.log.info("entry %s refused by risk: %s", symbol, rd.reason)
            return
        order = await self.submit(rd.request)
        if order is not None:
            self._pending_entries[order.client_id] = PendingEntry(order.id, symbol, self.clock(), decision,
                                                                  rd.request.stop_loss, tp,
                                                                  order.qty * price * fx)
            self.log.info("entry %s %s qty=%s @ %s (%s, stop %s)", symbol, decision.label, order.qty, price,
                          decision.reason, rd.request.stop_loss)

    # ------------------------------------------------------------------ order submission

    async def submit(self, req: OrderRequest) -> Order | None:
        """Send an approved order. Unhandled errors make the broker fall back to test mode."""
        mode = self.mode
        self.db.record_order(self.broker, mode, req)
        try:
            order = await self.adapter.place_order(req)
        except (OrderRejected, MarketClosed) as exc:
            self.db.record_order(self.broker, mode, req, status="rejected", error=str(exc))
            self.log.warning("order %s %s rejected: %s", req.side, req.symbol, exc)
            return None
        except Exception as exc:  # noqa: BLE001
            self.db.record_order(self.broker, mode, req, status="error", error=f"{type(exc).__name__}: {exc}")
            self.log.error("order handling error on %s: %s", req.symbol, exc)
            if mode == Mode.LIVE:
                self.mode_switch.fallback_to_test(self.broker, f"order handling error: {type(exc).__name__}")
            return None
        self.db.record_order(self.broker, mode, req, order=order)
        return order

    # ------------------------------------------------------------------ fills -> positions

    async def sync_fills(self) -> None:
        mode = self.mode
        for f in await self.adapter.poll_fills():
            fx = await self.adapter.fx_to_eur((await self.adapter.get_rules(f.symbol)).currency)
            fee_eur = f.fee * fx
            self.db.record_fill(self.broker, mode, f, fee_eur)
            self.db.update_order_status(f.order_id, "filled")
            if f.side == Side.BUY:
                self._on_entry_fill(f, fee_eur, mode)
            else:
                self._on_exit_fill(f, fee_eur, fx, mode)

    def _on_entry_fill(self, f: Fill, fee_eur: float, mode: Mode) -> None:
        pe = self._pending_entries.pop(f.client_id, None)
        existing = [p for p in self.db.open_positions(self.broker, mode) if p.symbol == f.symbol]
        if existing:  # partial fills accumulate into one position
            p = existing[0]
            qty = p.qty + f.qty
            self.db.update_position(p.id, qty=qty, entry_price=(p.entry_price * p.qty + f.price * f.qty) / qty,
                                    fees=p.fees + fee_eur)
            return
        decision = pe.decision if pe else None
        self.db.open_position(
            broker=self.broker, mode=mode, symbol=f.symbol, qty=f.qty, entry_price=f.price,
            currency=(self.cfg.universe_ibkr.entry(f.symbol).currency if self.broker == Broker.IBKR and
                      self.cfg.universe_ibkr.entry(f.symbol) else f.symbol.split("/")[-1]),
            target_price=decision.target_price if decision else None,
            take_profit_price=pe.take_profit if pe else None,
            stop_price=pe.stop_loss if pe else None, opened_at=f.ts, fees=fee_eur,
            entry_order_id=f.order_id, size_factor=decision.size_factor if decision else 1.0,
            entry_agents=list(decision.entering_agents) if decision else [])
        self.log.info("position opened %s qty=%s @ %s", f.symbol, f.qty, f.price)

    def _on_exit_fill(self, f: Fill, fee_eur: float, fx: float, mode: Mode) -> None:
        pex = self._pending_exits.pop(f.client_id, None)
        positions = [p for p in self.db.open_positions(self.broker, mode) if p.symbol == f.symbol]
        if not positions:
            self.log.warning("sell fill on %s without an open bot position", f.symbol)
            return
        p = positions[0]
        reason = pex.reason if pex else {Purpose.STOP: ExitReason.STOP_LOSS.value,
                                         Purpose.TAKE_PROFIT: ExitReason.TAKE_PROFIT.value}.get(f.purpose, "broker_exit")
        realized = (f.price - p.entry_price) * f.qty * fx
        remaining = p.qty - f.qty
        fees = p.fees + fee_eur
        if remaining > 1e-9:
            self.db.update_position(p.id, qty=remaining, fees=fees, pnl=(p.pnl or 0.0) + realized)
            return
        pnl = (p.pnl or 0.0) + realized - fees
        self.db.close_position(p.id, f.price, reason, pnl, fees, f.ts)
        self.state.flags.pop(f.symbol, None)
        self.log.info("position closed %s @ %s (%s) pnl=%.2f EUR", f.symbol, f.price, reason, pnl)

    # ------------------------------------------------------------------ pending orders

    async def manage_pending(self) -> None:
        now = self.clock()
        open_ids = {o.id for o in await self.adapter.get_open_orders()}
        timeout = timedelta(seconds=self.bcfg.execution.entry_timeout_seconds)
        for cid, pe in list(self._pending_entries.items()):
            if pe.order_id not in open_ids:
                self._pending_entries.pop(cid, None)  # filled (handled in sync) or cancelled/rejected
            elif now - pe.created > timeout:
                await self.adapter.cancel_order(pe.order_id)
                self._pending_entries.pop(cid, None)
                self.db.update_order_status(pe.order_id, "cancelled")
                self.log.info("entry on %s not filled within %s: cancelled", pe.symbol, timeout)
        exit_timeout = timedelta(seconds=self.bcfg.execution.exit_limit_timeout_seconds)
        for cid, px in list(self._pending_exits.items()):
            if px.order_id not in open_ids:
                continue
            if now - px.created > exit_timeout and not px.market_fallback_done:
                await self.adapter.cancel_order(px.order_id)
                self._pending_exits.pop(cid, None)
                self.log.info("exit limit on %s not filled: falling back to market", px.symbol)
                await self._send_exit(px.position_id, px.symbol, px.reason, market=True)

    # ------------------------------------------------------------------ exits

    async def manage_exits(self) -> None:
        now = self.clock()
        positions = self.db.open_positions(self.broker, self.mode)
        if not positions:
            return
        exiting = {px.symbol for px in self._pending_exits.values()}
        quotes = await self._quotes([p.symbol for p in positions])
        for p in positions:
            if p.symbol in exiting or p.symbol not in quotes:
                continue
            q = quotes[p.symbol]
            try:
                bars = await self.adapter.get_bars(p.symbol, 120)
            except BrokerError:
                bars = []
            smart = await self._smart_vote(p.symbol, q)
            view = PositionView(p.symbol, p.entry_price, p.target_price, p.stop_price, as_utc(p.opened_at))
            reason = self.exits.evaluate(view, q.bid or q.last, bars, smart, now)
            if self.broker == Broker.IBKR:
                await self._flag_weekend(p.symbol, now)
            if reason:
                await self.close_position_row(p.id, p.symbol, reason.value)

    async def _smart_vote(self, symbol: str, quote: Quote) -> Vote | None:
        cfgs = self.agent_cfgs()
        if not cfgs.get("smart_money", {}).get("enabled", True):
            return None
        only = {k: ({**v, "enabled": k == "smart_money"}) for k, v in cfgs.items()}
        snap = await self.data.snapshot(self.broker, self.adapter, symbol, quote)
        votes = await self.agents.votes(snap, only)
        return next((v for v in votes if v.agent == "smart_money"), None)

    async def _flag_weekend(self, symbol: str, now: datetime) -> None:
        sessions = await self.adapter.sessions(symbol, now)
        nxt = next((s for s, _ in sessions if s > now), None)
        if nxt is None or nxt - now > timedelta(hours=20):
            self.state.flags[symbol] = "held over weekend/holiday"
        else:
            self.state.flags.pop(symbol, None)

    async def close_position_row(self, position_id: int, symbol: str, reason: str, emergency: bool = False) -> bool:
        if not await self.adapter.is_market_open(symbol):
            self.state.flags[symbol] = f"exit pending ({reason}): market closed"
            self.log.warning("cannot exit %s now (%s): market closed", symbol, reason)
            return False
        # protective/bracket children must be cancelled first (they reserve the quantity)
        for o in await self.adapter.get_open_orders():
            if o.symbol == symbol and o.side == Side.SELL:
                await self.adapter.cancel_order(o.id)
        return await self._send_exit(position_id, symbol, reason, market=emergency, emergency=emergency)

    async def _send_exit(self, position_id: int, symbol: str, reason: str, market: bool,
                         emergency: bool = False) -> bool:
        pos = next((p for p in self.db.open_positions(self.broker, self.mode) if p.id == position_id), None)
        if pos is None:
            return False
        acct = await self.account_state()
        quote = await self.adapter.get_quote(symbol)
        rules = await self.adapter.get_rules(symbol)
        if market:
            req = OrderRequest(symbol, Side.SELL, pos.qty, OrderType.MARKET,
                               purpose=Purpose.EMERGENCY if emergency else Purpose.EXIT,
                               reference_price=quote.bid)
        elif self.broker == Broker.KRAKEN:
            req = OrderRequest(symbol, Side.SELL, pos.qty, OrderType.LIMIT,
                               limit_price=rules.round_price(quote.ask, Side.SELL), post_only=True,
                               purpose=Purpose.EXIT)
        else:
            req = OrderRequest(symbol, Side.SELL, pos.qty, OrderType.LIMIT,
                               limit_price=rules.round_price(quote.bid, Side.SELL), purpose=Purpose.EXIT)
        rd = self.risk.approve(self.broker, req, acct, rules, emergency=emergency or market)
        if not rd.approved:
            self.log.warning("exit %s refused by risk: %s", symbol, rd.reason)
            return False
        order = await self.submit(rd.request)
        if order is None and not market:
            return await self._send_exit(position_id, symbol, reason, market=True, emergency=emergency)
        if order is not None:
            self._pending_exits[order.client_id] = PendingExit(order.id, position_id, symbol, reason, self.clock(),
                                                               market_fallback_done=market)
            self.log.info("exit %s (%s) qty=%s %s", symbol, reason, pos.qty, "market" if market else "limit")
        return order is not None

    async def close_symbol(self, symbol: str, reason: str = ExitReason.MANUAL.value) -> str:
        async with self._lock:
            pos = next((p for p in self.db.open_positions(self.broker, self.mode) if p.symbol == symbol), None)
            if pos is None:
                return f"{self.broker}: no open position on {symbol}"
            ok = await self.close_position_row(pos.id, symbol, reason)
            return f"{self.broker}: exit order sent for {symbol}" if ok else f"{self.broker}: could not close {symbol}"

    async def close_all(self, reason: str, emergency: bool = False) -> list[str]:
        out = []
        for p in self.db.open_positions(self.broker, self.mode):
            ok = await self.close_position_row(p.id, p.symbol, reason, emergency=emergency)
            out.append(f"{p.symbol}: {'closing' if ok else 'NOT closed (see flags)'}")
        return out

    # ------------------------------------------------------------------ limits & kill

    async def handle_limit_events(self, events: list[RiskEvent]) -> None:
        kinds = {e.kind for e in events}
        reason = ", ".join(sorted(k.value for k in kinds))
        await self.close_all(f"risk_limit: {reason}", emergency=True)
        until = None if RiskEventKind.DRAWDOWN in kinds else self.clock().date() + timedelta(days=1)
        self.risk.halt(self.broker, reason, until)
        self.mode_switch.fallback_to_test(self.broker, reason)
        self.log.warning("risk limit hit (%s): positions closed, entries halted %s", reason,
                         "until manual review" if until is None else f"until {until}")

    async def kill(self) -> list[str]:
        """Cancel every order and close every position (in the current mode)."""
        self.entries_enabled = False
        report = []
        try:
            for o in await self.adapter.get_open_orders():
                try:
                    await self.adapter.cancel_order(o.id)
                except BrokerError as exc:
                    report.append(f"cancel {o.id} failed: {exc}")
            self._pending_entries.clear()
            self._pending_exits.clear()
            positions = self.db.open_positions(self.broker, self.mode)
            broker_pos = await self.adapter.get_positions()
            for p in positions:
                held = broker_pos.get(p.symbol)
                if held is None or held.qty <= 0:
                    continue
                ok = await self._send_exit(p.id, p.symbol, ExitReason.KILL.value, market=True, emergency=True) \
                    if await self.adapter.is_market_open(p.symbol) else False
                if not ok:
                    self.state.flags[p.symbol] = "KILL: could not close (market closed?) — stop-loss remains"
                report.append(f"{p.symbol}: {'market close sent' if ok else 'NOT closed'}")
        except Exception as exc:  # noqa: BLE001
            report.append(f"kill error: {type(exc).__name__}: {exc}")
            self.log.exception("kill failed")
        return report
