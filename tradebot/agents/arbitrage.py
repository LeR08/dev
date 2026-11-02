"""Arbitrage / relative-value agent.

* Kraken: triangular check EUR -> X -> bridge -> EUR versus the direct X/EUR
  price, net of three taker fees and slippage. LONG X/EUR only if X/EUR is
  cheap relative to the cross rate (SHORT if rich) and the edge survives costs.
* IBKR: pair trading on configured pairs; LONG the cheap leg / SHORT the rich
  leg when the spread z-score passes the threshold.
"""

from __future__ import annotations

import math

import numpy as np

from tradebot.agents.base import Direction, Snapshot, Vote
from tradebot.brokers.base import Quote

NAME = "arbitrage"


def triangular_edge(ask_x_eur: float, bid_x_bridge: float, bid_bridge_eur: float, fee: float,
                    slippage_bps: float) -> float:
    """Return of EUR -> X (buy at ask) -> bridge (sell X) -> EUR (sell bridge), net of costs."""
    if min(ask_x_eur, bid_x_bridge, bid_bridge_eur) <= 0:
        return -1.0
    gross = bid_x_bridge * bid_bridge_eur / ask_x_eur
    net = gross * (1 - fee) ** 3 * (1 - slippage_bps / 10_000) ** 3
    return net - 1


def _cross(related: dict[str, Quote], base: str, bridge: str) -> Quote | None:
    """``base/bridge`` quote, inverting ``bridge/base`` when only that pair is listed (e.g. ETH/BTC for BTC)."""
    q = related.get(f"{base}/{bridge}")
    if q is not None:
        return q
    inv = related.get(f"{bridge}/{base}")
    if inv is None or inv.bid <= 0 or inv.ask <= 0:
        return None
    return Quote(f"{base}/{bridge}", 1 / inv.ask, 1 / inv.bid, 1 / inv.last if inv.last else 0.0, ts=inv.ts)


def _vote_kraken(snap: Snapshot, cfg: dict) -> Vote:
    """LONG X/EUR when it is cheap vs the cross rate, SHORT when it is rich."""
    base, _, quote = snap.symbol.partition("/")
    q = snap.quote
    if q is None or q.ask <= 0 or q.bid <= 0:
        return Vote.none(NAME, "no quote")
    fee, slip = snap.taker_fee, float(cfg.get("slippage_bps", 5))
    best: tuple[float, Direction, str, float] | None = None
    for bridge in cfg.get("bridges", ["BTC", "ETH"]):
        if bridge == base:
            continue
        cross = _cross(snap.related_quotes, base, bridge)
        bridge_q = snap.related_quotes.get(f"{bridge}/{quote}")
        if cross is None or bridge_q is None:
            continue
        # cheap: buy X/EUR at ask, sell X via the bridge at bids
        long_edge = triangular_edge(q.ask, cross.bid, bridge_q.bid, fee, slip)
        # rich: sell X/EUR at bid, buy X via the bridge at asks
        short_edge = triangular_edge(cross.ask * bridge_q.ask, 1.0, q.bid, fee, slip) if cross.ask > 0 else -1.0
        for edge, direction, implied in ((long_edge, Direction.LONG, cross.bid * bridge_q.bid),
                                         (short_edge, Direction.SHORT, cross.ask * bridge_q.ask)):
            if best is None or edge > best[0]:
                best = (edge, direction, bridge, implied)
    if best is None:
        return Vote.none(NAME, "no triangle available for this pair")
    edge, direction, bridge, implied = best
    min_edge = float(cfg.get("min_edge_bps", 15)) / 10_000
    if edge < min_edge:
        return Vote.none(NAME, f"best triangle via {bridge}: net edge {edge * 1e4:.1f} bps < {min_edge * 1e4:.0f}")
    conf = min(1.0, 0.5 + (edge - min_edge) / (4 * min_edge))
    word = "cheap" if direction == Direction.LONG else "rich"
    return Vote(NAME, direction, round(conf, 3),
                f"{snap.symbol} {word} vs {base}/{bridge}x{bridge}/{quote}: net edge {edge * 1e4:.1f} bps",
                target_price=implied)


def pair_zscore(a: np.ndarray, b: np.ndarray) -> tuple[float, float, float, float]:
    """OLS hedge ratio on log prices; returns (z, beta, alpha, std) of the last spread."""
    la, lb = np.log(a), np.log(b)
    beta, alpha = np.polyfit(lb, la, 1)
    spread = la - (alpha + beta * lb)
    std = float(spread.std(ddof=1))
    if std <= 0:
        return 0.0, float(beta), float(alpha), 0.0
    return float(spread[-1] / std), float(beta), float(alpha), std


def _vote_ibkr(snap: Snapshot, cfg: dict) -> Vote:
    lookback = int(cfg.get("lookback", 60))
    z_entry = float(cfg.get("z_entry", 2.0))
    if not snap.pair_partners:
        return Vote.none(NAME, "symbol not in a configured pair")
    best: Vote | None = None
    for partner in snap.pair_partners:
        other = snap.related_bars.get(partner)
        if not other:
            continue
        mine = {b.ts: b.close for b in snap.bars}
        theirs = {b.ts: b.close for b in other}
        common = sorted(set(mine) & set(theirs))[-lookback:]
        if len(common) < max(20, lookback // 2):
            continue
        a = np.array([mine[t] for t in common])
        b = np.array([theirs[t] for t in common])
        z, beta, alpha, std = pair_zscore(a, b)
        if abs(z) >= z_entry:  # cheap leg -> LONG, rich leg -> SHORT
            target = math.exp(alpha + beta * math.log(b[-1]))
            conf = min(1.0, 0.5 + (abs(z) - z_entry) / (2 * z_entry))
            direction, word = (Direction.LONG, "cheap") if z < 0 else (Direction.SHORT, "rich")
            v = Vote(NAME, direction, round(conf, 3),
                     f"pair {snap.symbol}/{partner}: spread z={z:.2f} ({word} leg), beta={beta:.2f}",
                     target_price=target)
            if best is None or v.confidence > best.confidence:
                best = v
    return best or Vote.none(NAME, "no pair spread beyond threshold")


def vote(snap: Snapshot, cfg: dict) -> Vote:
    if snap.broker == "kraken":
        return _vote_kraken(snap, cfg)
    return _vote_ibkr(snap, cfg)
