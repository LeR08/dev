"""Trend agent: time-series momentum / channel breakout, as run by systematic trend followers (CTAs).

LONG when the close breaks above the highest high of the last ``breakout`` bars while
the fast average is above the slow one (and SHORT symmetrically). No price target:
trend trades are closed by the trailing stop, so winners can run.
"""

from __future__ import annotations

import numpy as np

from tradebot.agents.base import Direction, Snapshot, Vote

NAME = "trend"


def ema(values: np.ndarray, span: int) -> np.ndarray:
    alpha = 2 / (span + 1)
    out = np.empty_like(values)
    out[0] = values[0]
    for i in range(1, len(values)):
        out[i] = alpha * values[i] + (1 - alpha) * out[i - 1]
    return out


def vote(snap: Snapshot, cfg: dict) -> Vote:
    fast, slow, n = int(cfg.get("fast", 20)), int(cfg.get("slow", 100)), int(cfg.get("breakout", 55))
    min_gap = float(cfg.get("min_trend_gap_pct", 0.0))
    bars = snap.bars
    if len(bars) < max(slow, n) + 2:
        return Vote.none(NAME, f"not enough bars ({len(bars)})")
    close = np.array([b.close for b in bars])
    highs = np.array([b.high for b in bars])
    lows = np.array([b.low for b in bars])
    ef, es = ema(close, fast)[-1], ema(close, slow)[-1]
    gap = (ef / es - 1) * 100
    prior_high, prior_low = highs[-n - 1:-1].max(), lows[-n - 1:-1].min()
    last = close[-1]
    if last > prior_high and gap > min_gap:
        conf = min(1.0, 0.5 + gap / 10)
        return Vote(NAME, Direction.LONG, round(conf, 3),
                    f"breakout above {n}-bar high {prior_high:.6g}, EMA{fast}/{slow} gap {gap:+.2f}%")
    if last < prior_low and gap < -min_gap:
        conf = min(1.0, 0.5 + -gap / 10)
        return Vote(NAME, Direction.SHORT, round(conf, 3),
                    f"breakdown below {n}-bar low {prior_low:.6g}, EMA{fast}/{slow} gap {gap:+.2f}%")
    return Vote.none(NAME, f"no breakout (EMA gap {gap:+.2f}%, range {prior_low:.6g}-{prior_high:.6g})")
