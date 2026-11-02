"""Automatic leverage from market movement (volatility targeting).

leverage = target daily volatility / realised daily volatility, rounded down to a
whole number and clamped to [1, max_leverage] (1x = no margin; margin is 2x..10x): calm markets get more leverage, volatile markets less.
With ``full_consensus_only`` set, half-size signals (a single agent) trade at 1x.
"""

from __future__ import annotations

import math
from datetime import timedelta

import numpy as np

from tradebot.brokers.base import Bar
from tradebot.settings import LeverageCfg


def realised_daily_vol_pct(bars: list[Bar] | tuple[Bar, ...], lookback: int) -> float | None:
    """Daily volatility (%) estimated from close-to-close returns of the last ``lookback`` bars."""
    window = list(bars)[-(lookback + 1):]
    if len(window) < 10:
        return None
    closes = np.array([b.close for b in window], dtype=float)
    rets = np.diff(np.log(closes))
    sd = float(rets.std(ddof=1))
    if not math.isfinite(sd) or sd <= 0:
        return None
    step = (window[-1].ts - window[0].ts) / (len(window) - 1)
    bars_per_day = timedelta(days=1) / step if step.total_seconds() > 0 else 1.0
    return sd * math.sqrt(max(1.0, bars_per_day)) * 100


def auto_leverage(bars, cfg: LeverageCfg, max_leverage: float, size_factor: float) -> tuple[float, str]:
    """Return (leverage, explanation)."""
    if not cfg.enabled or max_leverage <= 1:
        return 1.0, "leverage disabled"
    if cfg.full_consensus_only and size_factor < 1.0:
        return 1.0, "half-size signal: 1x"
    vol = realised_daily_vol_pct(bars, cfg.vol_lookback_bars)
    if vol is None:
        return 1.0, "volatility unknown: 1x"
    # brokers only take whole leverage (Kraken: 2x..10x); round down, 1x = no margin
    lev = float(max(1, math.floor(min(max_leverage, cfg.target_daily_vol_pct / vol))))
    return lev, f"daily vol {vol:.2f}% vs target {cfg.target_daily_vol_pct}% -> {lev:.0f}x"
