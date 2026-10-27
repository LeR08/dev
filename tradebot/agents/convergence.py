"""Convergence agent: mean reversion toward VWAP / moving average, with volume confirmation."""

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
    price = snap.quote.ask if snap.quote and snap.quote.ask > 0 else float(close[-1])
    z = (price - ref) / std
    if z > -k:
        return Vote.none(NAME, f"z={z:.2f} vs {ref_name} (needs <= -{k})")

    vols = np.array([b.volume for b in bars[-vol_window - 1:-1]])
    avg_vol = float(vols.mean()) if len(vols) else 0.0
    last_vol = float(bars[-1].volume)
    if avg_vol <= 0 or last_vol < vol_mult * avg_vol:
        return Vote.none(NAME, f"z={z:.2f} but volume {last_vol:.0f} < {vol_mult}x avg {avg_vol:.0f}")

    conf = min(1.0, 0.5 + (abs(z) - k) / (2 * k) + 0.1 * (last_vol / avg_vol - vol_mult))
    if snap.data_delay_minutes > 0:
        conf *= 1 - float(cfg.get("delay_penalty", 0.0))
    conf = max(0.05, min(1.0, conf))
    return Vote(NAME, Direction.LONG, round(conf, 3),
                f"price {price:.6g} is {abs(z):.2f} sd below {ref_name} {ref:.6g}; volume {last_vol / avg_vol:.1f}x avg",
                target_price=ref)
