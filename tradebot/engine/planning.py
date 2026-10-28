"""Trade plan: where the stop goes, and whether the trade is worth taking.

* stop distance = ATR x ``stop_atr_mult`` (beyond normal market noise), kept
  between ``min_stop_pct`` and the RiskManager's hard ``stop_loss_pct``;
* the trade is taken only if the net gain to the take-profit is at least
  ``min_reward_risk`` times the net loss at the stop (round-trip fees counted
  on both sides).
"""

from __future__ import annotations

from dataclasses import dataclass

from tradebot.brokers.base import Bar, Fees, PositionSide
from tradebot.engine.exits import take_profit_price
from tradebot.settings import TradePlanCfg


def atr(bars: list[Bar] | tuple[Bar, ...], period: int) -> float | None:
    """Average true range over the last ``period`` bars."""
    bars = list(bars)
    if len(bars) < period + 1:
        return None
    trs = []
    for prev, b in zip(bars[-period - 1:-1], bars[-period:]):
        trs.append(max(b.high - b.low, abs(b.high - prev.close), abs(b.low - prev.close)))
    return sum(trs) / len(trs)


@dataclass(frozen=True)
class TradePlan:
    side: PositionSide
    entry: float
    stop: float
    take_profit: float
    atr: float | None
    reward_risk: float  # net of fees

    @property
    def risk_per_unit(self) -> float:
        return abs(self.entry - self.stop)


def plan_trade(side: PositionSide, entry: float, target: float | None, bars, cfg: TradePlanCfg,
               max_stop_pct: float, tp_fraction: float, fees: Fees) -> tuple[TradePlan | None, str]:
    tp = take_profit_price(entry, target, tp_fraction, side)
    if tp is None:
        return None, "no target on the right side of the price"
    a = atr(bars, cfg.atr_period)
    dist = a * cfg.stop_atr_mult if a else entry * max_stop_pct / 100
    dist = min(max(dist, entry * cfg.min_stop_pct / 100), entry * max_stop_pct / 100)
    stop = entry - side.sign * dist
    round_trip = entry * (fees.maker + fees.taker)  # maker entry, worst case taker exit
    net_reward = abs(tp - entry) - round_trip
    net_risk = dist + round_trip
    rr = net_reward / net_risk if net_risk > 0 else 0.0
    if rr < cfg.min_reward_risk:
        return None, (f"reward/risk {rr:.2f} < {cfg.min_reward_risk} (target {abs(tp - entry) / entry * 100:.2f}%, "
                      f"stop {dist / entry * 100:.2f}%, fees {round_trip / entry * 100:.2f}%)")
    return TradePlan(side, entry, stop, tp, a, rr), f"reward/risk {rr:.2f}, stop {dist / entry * 100:.2f}%"
