"""Backtester: replays cached bars through the SAME scanner, agents, consensus,
RiskManager, exit rules and the paper engine as a simulated broker.

* Decisions are taken on bar close; orders execute against the next bar
  (no look-ahead). Fees, spread and slippage are applied.
* IBKR: the data delay is simulated (agents see bars lagged by the delay).
* Walk-forward: parameters from a small grid are chosen on each train window
  and evaluated on the following, unseen test window.
"""

from __future__ import annotations

import itertools
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from tradebot.agents.base import InsiderActivity, InsiderTxn, OnchainFlow, Snapshot
from tradebot.agents.pool import AgentPool
from tradebot.brokers.base import (
    Bar,
    Broker,
    Fees,
    InstrumentRules,
    Mode,
    OrderBook,
    OrderRequest,
    OrderType,
    PositionSide,
    Purpose,
    Quote,
    Side,
)
from tradebot.brokers.ibkr import IBKRFeeSchedule
from tradebot.brokers.paper_engine import PaperEngine, pct_fee_fn
from tradebot.backtest.report import Metrics, Trade, compute_metrics, format_metrics
from tradebot.engine.consensus import decide
from tradebot.engine.leverage import auto_leverage
from tradebot.engine.planning import atr, plan_trade
from tradebot.engine.exits import ExitManager, PositionView
from tradebot.engine.risk import AccountState, PositionInfo, RiskManager
from tradebot.engine.scanner import InstrumentSnapshot, Scanner
from tradebot.settings import AppConfig


@dataclass
class BacktestResult:
    broker: str
    start: datetime
    end: datetime
    trades: list[Trade]
    equity: list[tuple[datetime, float]]
    metrics: Metrics
    params: dict = field(default_factory=dict)

    def report(self, title: str | None = None) -> str:
        t = title or f"Backtest {self.broker} {self.start:%Y-%m-%d} -> {self.end:%Y-%m-%d}"
        extra = f"\n  params           {self.params}" if self.params else ""
        return format_metrics(self.metrics, t) + extra


@dataclass
class _OpenPos:
    symbol: str
    qty: float
    entry: float
    target: float | None
    stop: float | None
    opened: datetime
    fees: float
    fx: float
    side: PositionSide = PositionSide.LONG
    leverage: float = 1.0
    initial_stop: float | None = None
    exit_reason: str | None = None
    exit_since: datetime | None = None


def apply_overrides(cfg: AppConfig, broker: str, overrides: dict[str, float]) -> AppConfig:
    """Return a deep copy with e.g. {"convergence.k_std": 2.5} applied to the broker's agents."""
    new = cfg.model_copy(deep=True)
    agents = getattr(new.strategy, broker).agents
    for path, value in overrides.items():
        agent, attr = path.split(".", 1)
        setattr(getattr(agents, agent), attr, value)
    return new


class Backtester:
    def __init__(self, cfg: AppConfig, broker: Broker | str, bars: dict[str, list[Bar]],
                 interval: timedelta, start_cash: float | None = None,
                 fees: Fees = Fees(0.0025, 0.0040),
                 onchain: dict[str, list[tuple[datetime, OnchainFlow]]] | None = None,
                 insiders: dict[str, list[InsiderTxn]] | None = None):
        self.cfg = cfg
        self.broker = Broker(broker)
        self.bars = {s: sorted(b, key=lambda x: x.ts) for s, b in bars.items() if b}
        self.interval = interval
        self.start_cash = start_cash or cfg.strategy.paper_starting_balance_eur.get(str(self.broker), 1000.0)
        self.fees = fees
        self.onchain = onchain or {}
        self.insiders = insiders or {}
        self.pool = AgentPool(isolated=False)

    # ------------------------------------------------------------------ helpers

    def _currency(self, symbol: str) -> str:
        if self.broker == Broker.KRAKEN:
            return symbol.split("/")[1]
        e = self.cfg.universe_ibkr.entry(symbol)
        return e.currency if e else "USD"

    def _fx(self, ccy: str) -> float:
        return 1.0 if ccy == "EUR" else self.cfg.strategy.ibkr.fx_fallback_to_eur.get(ccy, 1.0)

    def _rules(self, symbol: str) -> InstrumentRules:
        if self.broker == Broker.IBKR:
            return InstrumentRules(symbol, self._currency(symbol), min_qty=1, qty_step=1, tick_size=0.01)
        return InstrumentRules(symbol, self._currency(symbol), qty_step=1e-8, max_leverage=5)

    def _lag_bars(self) -> int:
        if self.broker != Broker.IBKR:
            return 0
        minutes = self.interval.total_seconds() / 60
        if minutes >= 1440:
            return 0  # daily bars: the delay is absorbed by next-bar execution
        return math.ceil(self.cfg.strategy.ibkr.data_delay_minutes / minutes)

    def periods_per_year(self) -> float:
        per_day = 86400 / self.interval.total_seconds()
        days = 365 if self.broker == Broker.KRAKEN else 252
        return per_day * days if per_day >= 1 else days * per_day

    # ------------------------------------------------------------------ run

    def run(self, start: datetime, end: datetime, overrides: dict | None = None) -> BacktestResult:
        cfg = apply_overrides(self.cfg, str(self.broker), overrides or {})
        bcfg = getattr(cfg.strategy, str(self.broker))
        bt = cfg.strategy.backtest
        if self.broker == Broker.KRAKEN:
            fee_fn = pct_fee_fn(self.fees)
        else:
            fee_fn = IBKRFeeSchedule(cfg.strategy.ibkr.fees, self._currency)
        clock_now = [start]
        paper = PaperEngine(str(self.broker), self.start_cash, fee_fn, slippage_bps=bt.slippage_bps, fx=self._fx,
                            clock=lambda: clock_now[0], financing=bcfg.financing)
        risk = RiskManager(cfg.risk.model_copy(deep=True), clock=lambda: clock_now[0])
        scanner = Scanner(self.broker, bcfg.scanner)
        exits = ExitManager(cfg.strategy.exits, str(self.broker))
        agent_cfgs = bcfg.agents.model_dump()
        lag = self._lag_bars()
        half = bt.spread_bps / 20_000

        index = {s: {b.ts: i for i, b in enumerate(bars)} for s, bars in self.bars.items()}
        timeline = sorted({b.ts for bars in self.bars.values() for b in bars if start <= b.ts <= end})
        positions: dict[str, _OpenPos] = {}
        # order id -> (symbol, created, target, stop, side, leverage)
        pending: dict[str, tuple[str, datetime, float | None, float | None, PositionSide, float]] = {}
        trades: list[Trade] = []
        equity_curve: list[tuple[datetime, float]] = []
        peak = day_start = self.start_cash
        day = None

        for ts in timeline:
            clock_now[0] = ts
            # 1) execute resting orders against this bar
            for s, bars in self.bars.items():
                i = index[s].get(ts)
                if i is None:
                    continue
                for f in paper.on_bar(s, bars[i], bt.spread_bps):
                    if f.purpose == Purpose.ENTRY:
                        info = pending.pop(f.order_id, None)
                        target, stop, side, lev = (info[2], info[3], info[4], info[5]) if info else \
                            (None, None, PositionSide.LONG if f.side == Side.BUY else PositionSide.SHORT, 1.0)
                        fx = self._fx(self._currency(s))
                        positions[s] = _OpenPos(s, f.qty, f.price, target, stop, ts, f.fee * fx, fx, side, lev, stop)
                    else:
                        p = positions.pop(s, None)
                        if p:
                            reason = {Purpose.STOP: "trailing_stop" if p.stop != p.initial_stop else "stop_loss",
                                      Purpose.TAKE_PROFIT: "take_profit",
                                      Purpose.EMERGENCY: "liquidation"}.get(f.purpose, p.exit_reason or "exit")
                            fees = p.fees + f.fee * p.fx
                            pnl = (f.price - p.entry) * f.qty * p.side.sign * p.fx - fees
                            trades.append(Trade(s, p.opened, ts, p.entry, f.price, f.qty, pnl, fees, reason,
                                                p.side.value, p.leverage))
            # entries not filled within one bar are cancelled
            for oid, (s, created, *_rest) in list(pending.items()):
                if created < ts:
                    paper.cancel(oid)
                    pending.pop(oid, None)

            equity = paper.equity()
            equity_curve.append((ts, equity))
            if day != ts.date():
                day, day_start = ts.date(), equity
            peak = max(peak, equity)

            def acct_state() -> AccountState:
                infos = {s: PositionInfo(p.qty * p.side.sign, p.qty * (paper.last_price(s) or p.entry) * p.fx,
                                         p.leverage) for s, p in positions.items()}
                return AccountState(self.broker, Mode.TEST, paper.equity(), paper.cash - paper.reserved_cash(),
                                    infos, sum(o.qty * (o.limit_price or 0) for o in paper.open_orders()
                                               if o.purpose == Purpose.ENTRY),
                                    len(pending), day_start, peak)

            # 2) account limits
            events = risk.evaluate_account(self.broker, acct_state())
            if events:
                for s in list(positions):
                    self._market_exit(paper, risk, positions, s, acct_state(), "risk_limit", trades)
                kinds = {e.kind.value for e in events}
                until = None if "drawdown_limit" in kinds else ts.date() + timedelta(days=1)
                risk.halt(self.broker, ",".join(kinds), until)

            # 3) exits
            for s, p in list(positions.items()):
                i = index[s].get(ts)
                if i is None:
                    continue
                visible = self.bars[s][: i + 1 - lag] if lag else self.bars[s][: i + 1]
                snap = self._snapshot(s, ts, visible, half, agent_cfgs)
                smart = next(v for v in self.pool.vote_sync(snap, {k: {**v, "enabled": k == "smart_money"}
                                                                   for k, v in agent_cfgs.items()})
                             if v.agent == "smart_money")
                if p.exit_reason is not None:  # limit exit not filled within one bar -> market
                    if p.exit_since is not None and p.exit_since < ts:
                        self._market_exit(paper, risk, positions, s, acct_state(), p.exit_reason, trades)
                    continue
                close = self.bars[s][i].close
                view = PositionView(s, p.entry, p.target, p.stop, p.opened, p.side, p.initial_stop)
                new_stop = exits.trailing_stop(view, close, atr(visible, cfg.strategy.trade_plan.atr_period),
                                               self.fees.maker + self.fees.taker)
                if new_stop is not None:
                    self._move_stop(paper, p, new_stop)
                    view.stop_price = new_stop
                reason = exits.evaluate(view, close, visible, smart, ts)
                if reason:
                    self._limit_exit(paper, risk, p, acct_state(), reason.value, close * (1 + half * p.side.sign), ts)

            # 4) entries
            if risk.halt_reason(self.broker):
                continue
            snaps = []
            for s, bars in self.bars.items():
                i = index[s].get(ts)
                if i is None:
                    continue
                b = bars[i]
                q = Quote(s, b.close * (1 - half), b.close * (1 + half), b.close, b.volume, ts)
                depth = b.close * b.volume / 2
                book = OrderBook(s, ((q.bid, depth / q.bid),), ((q.ask, depth / q.ask),), ts)
                adv = sum(x.volume for x in bars[max(0, i - 19): i + 1]) / min(20, i + 1)
                earnings = frozenset()
                if self.broker == Broker.IBKR:
                    e = self.cfg.universe_ibkr.entry(s)
                    earnings = frozenset(datetime.fromisoformat(d).date() for d in (e.earnings_dates if e else []))
                session = (ts - timedelta(days=1), ts + timedelta(days=1))  # bars only exist in sessions
                snaps.append(InstrumentSnapshot(s, q, book, adv, session, True, earnings))
            scan = scanner.scan(snaps, ts) if self.broker == Broker.KRAKEN else self._scan_ibkr(scanner, snaps, ts)
            for s in scan.passed:
                if s in positions or any(v[0] == s for v in pending.values()):
                    continue
                i = index[s][ts]
                visible = self.bars[s][: i + 1 - lag] if lag else self.bars[s][: i + 1]
                snap = self._snapshot(s, ts, visible, half, agent_cfgs)
                decision = decide(self.pool.vote_sync(snap, agent_cfgs), cfg.strategy.consensus)
                if not decision.trade:
                    continue
                side = decision.side
                close = self.bars[s][i].close
                price = close * (1 - half) if side == PositionSide.LONG else close * (1 + half)
                rules = self._rules(s)
                fx = self._fx(rules.currency)
                rc = risk.cfg(self.broker)
                plan, _why = plan_trade(side, price, decision.target_price, visible, cfg.strategy.trade_plan,
                                        rc.stop_loss_pct, cfg.strategy.exits.take_profit_fraction, self._plan_fees())
                if plan is None:
                    continue
                lev, _ = auto_leverage(visible, bcfg.leverage, min(rc.max_leverage, rules.max_leverage),
                                       decision.size_factor)
                tp = plan.take_profit
                acct = acct_state()
                acct.fx = fx
                pct = rc.max_position_pct_full if decision.size_factor >= 1 else rc.max_position_pct_half
                qty = rules.round_qty(risk.capital(self.broker, acct) * pct / 100 * lev / (price * fx))
                req = OrderRequest(s, side.entry_side, qty, OrderType.LIMIT, limit_price=price, reference_price=price,
                                   take_profit=tp if self.broker == Broker.IBKR else None, purpose=Purpose.ENTRY,
                                   leverage=lev, stop_loss=plan.stop)
                rd = risk.approve(self.broker, req, acct, rules, decision.size_factor)
                if not rd.approved:
                    continue
                order = paper.place(rd.request, rules)
                if order.is_open:
                    pending[order.id] = (s, ts, decision.target_price, rd.request.stop_loss, side,
                                         rd.request.leverage)

        # close what is left at the last price
        for s in list(positions):
            self._market_exit(paper, risk, positions, s, None, "end_of_test", trades)
        if timeline:
            equity_curve.append((timeline[-1], paper.equity()))
        bh = self._buy_and_hold(start, end)
        metrics = compute_metrics(trades, [e for _, e in equity_curve], self.periods_per_year(), self.start_cash,
                                  fees_paid=paper.fees_paid, buy_and_hold_pct=bh)
        return BacktestResult(str(self.broker), start, end, trades, equity_curve, metrics, overrides or {})

    def _scan_ibkr(self, scanner: Scanner, snaps, ts):
        # time-of-day windows are meaningless on daily bars: only spread / volume / earnings apply
        cfg = scanner.cfg.model_copy(update={"avoid_open_close_minutes": 0})
        return Scanner(self.broker, cfg).scan(snaps, ts)

    def _plan_fees(self) -> Fees:
        return self.fees if self.broker == Broker.KRAKEN else Fees(0.001, 0.001)

    def _move_stop(self, paper: PaperEngine, p: _OpenPos, new_stop: float) -> None:
        """Replace the broker-side stop with a tighter one (same OCO group as the old one)."""
        group = None
        for o in paper.open_orders():
            if o.symbol == p.symbol and o.order_type == OrderType.STOP_LOSS:
                group = o.oco_group
                paper.cancel(o.id)
        held = paper.positions.get(p.symbol)
        if held is None:
            return
        paper.place(OrderRequest(p.symbol, p.side.exit_side, abs(held.qty), OrderType.STOP_LOSS, stop_price=new_stop,
                                 purpose=Purpose.STOP, leverage=p.leverage),
                    self._rules(p.symbol), oco_group=group)
        p.stop = new_stop

    def _limit_exit(self, paper: PaperEngine, risk: RiskManager, p: _OpenPos, acct: AccountState, reason: str,
                    price: float, ts: datetime) -> None:
        """Maker exit at our side of the spread (like the live bot); the stop stays in place meanwhile."""
        held = paper.positions.get(p.symbol)
        if held is None:
            return
        req = OrderRequest(p.symbol, p.side.exit_side, abs(held.qty), OrderType.LIMIT, limit_price=price,
                           post_only=True, purpose=Purpose.EXIT, leverage=p.leverage)
        rd = risk.approve(self.broker, req, acct, emergency=True)
        if rd.approved and paper.place(rd.request, self._rules(p.symbol)).is_open:
            p.exit_reason, p.exit_since = reason, ts

    def _market_exit(self, paper: PaperEngine, risk: RiskManager, positions: dict, symbol: str,
                     acct: AccountState | None, reason: str, trades: list[Trade]) -> None:
        p = positions.get(symbol)
        if p is None:
            return
        for o in paper.open_orders():
            if o.symbol == symbol and o.side == p.side.exit_side:
                paper.cancel(o.id)
        held = paper.positions.get(symbol)
        if held is None:
            positions.pop(symbol, None)
            return
        xs = p.side.exit_side
        if acct is not None:
            req = OrderRequest(symbol, xs, abs(held.qty), OrderType.MARKET, purpose=Purpose.EXIT,
                               leverage=p.leverage)
            rd = risk.approve(self.broker, req, acct, emergency=True)
            if not rd.approved:
                return
            req = rd.request
        else:
            req = OrderRequest(symbol, xs, abs(held.qty), OrderType.MARKET, purpose=Purpose.EXIT, leverage=p.leverage)
        order = paper.place(req, self._rules(symbol))
        if order.status.value == "filled":
            positions.pop(symbol, None)
            fees = p.fees + order.fee * p.fx
            pnl = (order.avg_fill_price - p.entry) * order.qty * p.side.sign * p.fx - fees
            trades.append(Trade(symbol, p.opened, paper.clock(), p.entry, order.avg_fill_price, order.qty,
                                pnl, fees, reason, p.side.value, p.leverage))

    def _snapshot(self, symbol: str, ts: datetime, visible: list[Bar], half: float, agent_cfgs: dict) -> Snapshot:
        last = visible[-1] if visible else None
        quote = Quote(symbol, last.close * (1 - half), last.close * (1 + half), last.close, last.volume, ts) \
            if last else None
        related_quotes: dict[str, Quote] = {}
        related_bars: dict[str, tuple[Bar, ...]] = {}
        partners: tuple[str, ...] = ()
        onchain = None
        insider = None
        if self.broker == Broker.KRAKEN:
            for s, bars in self.bars.items():
                if s == symbol:
                    continue
                j = self._idx_at(bars, ts)
                if j is not None:
                    c = bars[j].close
                    related_quotes[s] = Quote(s, c * (1 - half), c * (1 + half), c, bars[j].volume, ts)
            events = [f for t, f in self.onchain.get(symbol.split("/")[0], []) if t <= ts]
            onchain = events[-1] if events else None
        else:
            for a, b in self.cfg.universe_ibkr.pairs:
                other = b if a == symbol else a if b == symbol else None
                if other and other in self.bars:
                    partners += (other,)
                    related_bars[other] = tuple(x for x in self.bars[other] if x.ts <= (visible[-1].ts if visible else ts))
            window = self.cfg.strategy.ibkr.agents.smart_money.window_days
            txns = tuple(t for t in self.insiders.get(symbol, []) if ts - timedelta(days=window) <= t.date <= ts)
            insider = InsiderActivity(window, txns) if symbol in self.insiders else None
        return Snapshot(str(self.broker), symbol, ts, tuple(visible), quote, related_quotes, related_bars, partners,
                        onchain, insider, self.fees.taker,
                        self.cfg.strategy.ibkr.data_delay_minutes if self.broker == Broker.IBKR else 0)

    @staticmethod
    def _idx_at(bars: list[Bar], ts: datetime) -> int | None:
        lo, hi = 0, len(bars) - 1
        ans = None
        while lo <= hi:
            mid = (lo + hi) // 2
            if bars[mid].ts <= ts:
                ans, lo = mid, mid + 1
            else:
                hi = mid - 1
        return ans

    def _buy_and_hold(self, start: datetime, end: datetime) -> float | None:
        rets = []
        for bars in self.bars.values():
            window = [b for b in bars if start <= b.ts <= end]
            if len(window) >= 2 and window[0].open > 0:
                rets.append(window[-1].close / window[0].open - 1)
        return sum(rets) / len(rets) * 100 if rets else None

    # ------------------------------------------------------------------ walk-forward

    def walk_forward(self, start: datetime, end: datetime) -> tuple[list[tuple[BacktestResult, BacktestResult]], str]:
        wf = self.cfg.strategy.backtest.walk_forward
        grid = wf.grid or {}
        combos = [dict(zip(grid, vals)) for vals in itertools.product(*grid.values())] if grid else [{}]
        total = end - start
        fold_len = total / max(1, wf.folds)
        folds = []
        lines = []
        for k in range(max(1, wf.folds)):
            f_start = start + fold_len * k
            f_split = f_start + fold_len * wf.train_fraction
            f_end = f_start + fold_len
            best: BacktestResult | None = None
            for params in combos:
                r = self.run(f_start, f_split, params)
                if best is None or (r.metrics.sharpe, r.metrics.total_return_pct) > \
                        (best.metrics.sharpe, best.metrics.total_return_pct):
                    best = r
            test = self.run(f_split, f_end, best.params if best else {})
            folds.append((best, test))
            lines.append(f"fold {k + 1}: train {f_start:%Y-%m-%d}->{f_split:%Y-%m-%d} sharpe "
                         f"{best.metrics.sharpe:.2f} ret {best.metrics.total_return_pct:+.2f}% | test -> "
                         f"{f_end:%Y-%m-%d} sharpe {test.metrics.sharpe:.2f} ret {test.metrics.total_return_pct:+.2f}% "
                         f"trades {test.metrics.n_trades} params {best.params}")
        oos_trades = sum(t.metrics.n_trades for _, t in folds)
        summary = "\n".join(["== Walk-forward (out-of-sample test windows) =="] + lines +
                            [f"out-of-sample trades: {oos_trades}" +
                             ("  !! NOT SIGNIFICANT (<100 trades)" if oos_trades < 100 else "")])
        return folds, summary
