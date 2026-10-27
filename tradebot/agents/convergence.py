"""Convergence agent: mean reversion toward VWAP / moving average, with volume confirmation.

Price k standard deviations BELOW the reference -> LONG; ABOVE -> SHORT. Target = reference.
"""

from __future__ import annotations

import numpy as np

from tradebot.agents.base import Direction, Snapshot, Vote

NAME = "convergence"


def vote(snap: Snapshot, cfg: dict) -> Vote:
    window = int(cfg.get("window", 48))
    k = float(cfg.get("k_std", 2.0))
    vol_mult = float(cfg.get("volume_mult", 1.5))
    vol_window = int(cfg.get("volume_window", window))
    bars = snap.bars
    if len(bars) < max(window, vol_window) + 1:
        return Vote.none(NAME, f"not enough bars ({len(bars)})")

    close = np.array([b.close for b in bars[-window:]])
    vol = np.array([b.volume for b in bars[-window:]])
    typical = np.array([(b.high + b.low + b.close) / 3 for b in bars[-window:]])
    if cfg.get("reference", "vwap") == "vwap" and vol.sum() > 0:
        ref = float((typical * vol).sum() / vol.sum())
        ref_name = "VWAP"
    else:
        ref = float(close.mean())
        ref_name = f"SMA{window}"
    std = float(close.std(ddof=1))
    if std <= abs(ref) * 1e-6:
        return Vote.none(NAME, "no volatility")
    last_close = float(close[-1])
    q = snap.quote
    z_long = ((q.ask if q and q.ask > 0 else last_close) - ref) / std
    z_short = ((q.bid if q and q.bid > 0 else last_close) - ref) / std
    if z_long <= -k:
        direction, z, price = Direction.LONG, z_long, (q.ask if q and q.ask > 0 else last_close)
    elif z_short >= k:
        direction, z, price = Direction.SHORT, z_short, (q.bid if q and q.bid > 0 else last_close)
    else:
        return Vote.none(NAME, f"z={z_long:.2f} vs {ref_name} (needs <= -{k} or >= +{k})")

    vols = np.array([b.volume for b in bars[-vol_window - 1:-1]])
    avg_vol = float(vols.mean()) if len(vols) else 0.0
    last_vol = float(bars[-1].volume)
    if avg_vol <= 0 or last_vol < vol_mult * avg_vol:
        return Vote.none(NAME, f"z={z:.2f} but volume {last_vol:.0f} < {vol_mult}x avg {avg_vol:.0f}")

    conf = 0.5 + (abs(z) - k) / (2 * k) + 0.1 * (last_vol / avg_vol - vol_mult)
    if snap.data_delay_minutes > 0:
        conf *= 1 - float(cfg.get("delay_penalty", 0.0))
    conf = max(0.05, min(1.0, conf))
    where = "below" if direction == Direction.LONG else "above"
    return Vote(NAME, direction, round(conf, 3),
                f"price {price:.6g} is {abs(z):.2f} sd {where} {ref_name} {ref:.6g}; volume {last_vol / avg_vol:.1f}x avg",
                target_price=ref)
