"""Backtest of the liquidity mode with the exact live rules (see engine/liquidity.py)."""

from __future__ import annotations

from datetime import datetime, timedelta

from tradebot.backtest.report import Metrics, Trade, compute_metrics, format_metrics
from tradebot.brokers.base import Bar
from tradebot.data.defillama import supply_change
from tradebot.settings import LiquidityCfg

ROLLOVER_PER_DAY = 0.0012  # Kraken margin: 0.02 % per 4 h on the borrowed amount


def run_liquidity(bars: dict[str, list[Bar]], supply: list[tuple[datetime, float]], cfg: LiquidityCfg,
                  start: datetime, end: datetime, fee: float = 0.004, slippage: float = 0.001,
                  capital: float = 1000.0) -> tuple[list[Trade], list[tuple[datetime, float]], Metrics]:
    by_day = {s: {b.ts.date(): b for b in bs} for s, bs in bars.items()}
    days = sorted({b.ts for bs in bars.values() for b in bs if start <= b.ts <= end})
    cash, sym, qty, debt, last_px, cost_in, opened, tranches = capital, None, 0.0, 0.0, 0.0, 0.0, None, 0
    trades: list[Trade] = []
    curve: list[tuple[datetime, float]] = []
    fees_total = 0.0
    for ts in days:
        px = {s: d[ts.date()].close for s, d in by_day.items() if ts.date() in d}
        equity = cash + (qty * px[sym] - debt if sym in px else 0.0)
        if sym and sym in px:
            debt *= 1 + ROLLOVER_PER_DAY if debt > 0 else 1
            room = cfg.max_tranches is None or tranches < cfg.max_tranches
            if px[sym] <= last_px * (1 - cfg.reinject_drop_pct / 100) and room:
                stake = equity * cfg.tranche_pct / 100
                notional = stake * cfg.leverage
                f = notional * (fee + slippage)
                cash -= stake + f; debt += notional - stake; qty += notional / px[sym]
                last_px, cost_in, tranches, fees_total = px[sym], cost_in + stake + f, tranches + 1, fees_total + f
        decide = cfg.decision_day == "daily" or ts.weekday() == 6
        if decide:
            sig = supply_change(supply, cfg.window_days, ts + timedelta(days=1))
            favourable = sig is not None and sig[0] > 0
            if sym and not favourable and sym in px:
                gross = qty * px[sym]
                f = gross * (fee + slippage)
                proceeds = gross - f - debt
                cash += proceeds
                fees_total += f
                trades.append(Trade(sym, opened, ts, cost_in / max(qty, 1e-12), px[sym], qty, proceeds - cost_in,
                                    0.0, "liquidity_off", "long", float(cfg.leverage)))
                sym, qty, debt = None, 0.0, 0.0
            elif not sym and favourable:
                best, mom = None, float("-inf")
                for s in px:
                    past = by_day[s].get((ts - timedelta(days=cfg.momentum_days)).date())
                    if past and px[s] / past.close - 1 > mom:
                        best, mom = s, px[s] / past.close - 1
                if best:
                    stake = equity * cfg.tranche_pct / 100
                    notional = stake * cfg.leverage
                    f = notional * (fee + slippage)
                    cash -= stake + f; debt = notional - stake; qty = notional / px[best]
                    sym, last_px, cost_in, opened, tranches = best, px[best], stake + f, ts, 1
                    fees_total += f
        curve.append((ts, cash + (qty * px[sym] - debt if sym in px else 0.0)))
    if sym and curve:
        trades.append(Trade(sym, opened, curve[-1][0], cost_in / max(qty, 1e-12), 0.0, qty,
                            curve[-1][1] - cash - cost_in, 0.0, "end_of_test", "long", float(cfg.leverage)))
    per_year = 365.0
    metrics = compute_metrics(trades, [e for _, e in curve], per_year, capital, fees_paid=fees_total)
    return trades, curve, metrics


def report(metrics: Metrics, title: str) -> str:
    return format_metrics(metrics, title)
