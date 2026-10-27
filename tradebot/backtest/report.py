"""Performance metrics shared by backtests and the live/paper ``report`` command."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime

import numpy as np

MIN_SIGNIFICANT_TRADES = 100


@dataclass
class Trade:
    symbol: str
    entry_ts: datetime
    exit_ts: datetime
    entry_price: float
    exit_price: float
    qty: float
    pnl: float  # EUR, net of fees
    fees: float  # EUR
    reason: str


@dataclass
class Metrics:
    start_equity: float
    end_equity: float
    total_return_pct: float
    max_drawdown_pct: float
    n_trades: int
    win_rate_pct: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    sharpe: float
    fees_paid: float
    buy_and_hold_return_pct: float | None = None
    exit_reasons: dict[str, int] = field(default_factory=dict)

    @property
    def significant(self) -> bool:
        return self.n_trades >= MIN_SIGNIFICANT_TRADES


def max_drawdown_pct(equity: list[float]) -> float:
    peak, mdd = -math.inf, 0.0
    for e in equity:
        peak = max(peak, e)
        if peak > 0:
            mdd = max(mdd, (peak - e) / peak * 100)
    return mdd


def sharpe_ratio(equity: list[float], periods_per_year: float) -> float:
    if len(equity) < 3:
        return 0.0
    eq = np.asarray(equity, dtype=float)
    rets = np.diff(eq) / eq[:-1]
    sd = rets.std(ddof=1)
    if sd <= 0 or not np.isfinite(sd):
        return 0.0
    return float(rets.mean() / sd * math.sqrt(periods_per_year))


def compute_metrics(trades: list[Trade], equity: list[float], periods_per_year: float, start_equity: float,
                    fees_paid: float | None = None, buy_and_hold_pct: float | None = None) -> Metrics:
    end = equity[-1] if equity else start_equity
    wins = [t.pnl for t in trades if t.pnl > 0]
    losses = [t.pnl for t in trades if t.pnl <= 0]
    gross_win, gross_loss = sum(wins), -sum(losses)
    reasons: dict[str, int] = {}
    for t in trades:
        reasons[t.reason] = reasons.get(t.reason, 0) + 1
    return Metrics(
        start_equity=start_equity,
        end_equity=end,
        total_return_pct=(end - start_equity) / start_equity * 100 if start_equity else 0.0,
        max_drawdown_pct=max_drawdown_pct([start_equity] + list(equity)),
        n_trades=len(trades),
        win_rate_pct=len(wins) / len(trades) * 100 if trades else 0.0,
        avg_win=gross_win / len(wins) if wins else 0.0,
        avg_loss=-gross_loss / len(losses) if losses else 0.0,
        profit_factor=gross_win / gross_loss if gross_loss > 0 else (math.inf if gross_win > 0 else 0.0),
        sharpe=sharpe_ratio(equity, periods_per_year),
        fees_paid=fees_paid if fees_paid is not None else sum(t.fees for t in trades),
        buy_and_hold_return_pct=buy_and_hold_pct,
        exit_reasons=reasons,
    )


def format_metrics(m: Metrics, title: str) -> str:
    pf = "inf" if math.isinf(m.profit_factor) else f"{m.profit_factor:.2f}"
    lines = [
        f"== {title} ==",
        f"  equity           {m.start_equity:,.2f} -> {m.end_equity:,.2f} EUR",
        f"  total return     {m.total_return_pct:+.2f} %",
        f"  max drawdown     {m.max_drawdown_pct:.2f} %",
        f"  trades           {m.n_trades}",
        f"  win rate         {m.win_rate_pct:.1f} %",
        f"  avg win / loss   {m.avg_win:+.2f} / {m.avg_loss:+.2f} EUR",
        f"  profit factor    {pf}",
        f"  sharpe           {m.sharpe:.2f}",
        f"  fees paid        {m.fees_paid:,.2f} EUR",
    ]
    if m.buy_and_hold_return_pct is not None:
        lines.append(f"  buy & hold       {m.buy_and_hold_return_pct:+.2f} % (same universe, equal weight)")
    if m.exit_reasons:
        lines.append("  exits            " + ", ".join(f"{k}={v}" for k, v in sorted(m.exit_reasons.items())))
    if not m.significant:
        lines.append(f"  !! NOT SIGNIFICANT: fewer than {MIN_SIGNIFICANT_TRADES} trades")
    return "\n".join(lines)
