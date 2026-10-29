"""Exit logic: a position closes on the first condition met.

The stop-loss also lives at the broker (Kraken conditional close / IBKR bracket
child) so a bot crash never leaves a position unprotected. Rules are symmetric
for longs and shorts.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

import numpy as np

from tradebot.agents.base import Direction, Vote
from tradebot.brokers.base import Bar, PositionSide
from tradebot.settings import ExitsCfg


class ExitReason(StrEnum):
    TAKE_PROFIT = "take_profit"
    VOLUME_SPIKE = "volume_spike"
    SMART_MONEY = "smart_money_reversal"
    STOP_LOSS = "stop_loss"
    TIME_STOP = "time_stop"
    KILL = "kill_switch"
    MANUAL = "manual_close"
    RISK_LIMIT = "risk_limit"
    LIQUIDATION = "liquidation"


@dataclass
class PositionView:
    symbol: str
    entry_price: float
    target_price: float | None
    stop_price: float | None
    opened_at: datetime
    side: PositionSide = PositionSide.LONG
    initial_stop: float | None = None

    @property
    def initial_risk(self) -> float | None:
        stop = self.initial_stop if self.initial_stop is not None else self.stop_price
        return abs(self.entry_price - stop) if stop is not None else None


def take_profit_price(entry: float, target: float | None, fraction: float,
                      side: PositionSide = PositionSide.LONG) -> float | None:
    """Price at ``fraction`` of the way from entry to the agent's target (None if the target is on the wrong side)."""
    if target is None or (target - entry) * side.sign <= 0:
        return None
    return entry + fraction * (target - entry)


class ExitManager:
    def __init__(self, cfg: ExitsCfg, broker: str):
        self.cfg = cfg
        self.broker = broker

    def evaluate(self, pos: PositionView, price: float, bars: list[Bar] | tuple[Bar, ...],
                 smart_vote: Vote | None, now: datetime) -> ExitReason | None:
        """``price`` is the price the position would close at (bid for longs, ask for shorts)."""
        sign = pos.side.sign
        tp = take_profit_price(pos.entry_price, pos.target_price, self.cfg.take_profit_fraction, pos.side)
        if tp is not None and (price - tp) * sign >= 0:
            return ExitReason.TAKE_PROFIT
        in_profit = (price - pos.entry_price) * sign > 0
        if (in_profit or not self.cfg.volume_spike.only_in_profit) and self._volume_spike(bars, pos.opened_at):
            return ExitReason.VOLUME_SPIKE
        if smart_vote is not None:
            against = Direction.SHORT if pos.side == PositionSide.LONG else Direction.LONG
            if smart_vote.direction in (Direction.AVOID, against):
                return ExitReason.SMART_MONEY
        if pos.stop_price is not None and (price - pos.stop_price) * sign <= 0:
            return ExitReason.STOP_LOSS
        max_h = self.cfg.max_holding_hours.get(self.broker)
        trailing = pos.initial_stop is not None and pos.stop_price is not None and \
            (pos.stop_price - pos.initial_stop) * sign > 0
        # the time stop is for trades going nowhere; a trade already protected by its trailing stop runs on
        if max_h is not None and not trailing and now - pos.opened_at >= timedelta(hours=max_h):
            return ExitReason.TIME_STOP
        return None

    def trailing_stop(self, pos: PositionView, price: float, atr_value: float | None,
                      fee_rate: float = 0.0) -> float | None:
        """New (tighter) stop, or None. Break-even (+fees) at ``breakeven_at_r`` R, then ATR trail."""
        t = self.cfg.trailing
        risk = pos.initial_risk
        if not t.enabled or not risk or pos.stop_price is None:
            return None
        sign = pos.side.sign
        gain = (price - pos.entry_price) * sign
        candidates = []
        if t.breakeven_at_r > 0:
            if gain < t.breakeven_at_r * risk:
                return None
            candidates.append(pos.entry_price * (1 + sign * fee_rate))  # never give back the fees once reached
        if atr_value:
            # breakeven_at_r = 0: chandelier stop, trailing from the first bar
            candidates.append(price - sign * t.trail_atr_mult * atr_value)
        if not candidates:
            return None
        new = max(candidates) if sign > 0 else min(candidates)
        if (price - new) * sign <= 0:
            return None  # would be at/through the market
        min_step = price * 0.001
        if (new - pos.stop_price) * sign <= min_step:
            return None  # only tighten, and only by a meaningful amount
        return new

    def _volume_spike(self, bars, opened_at: datetime) -> bool:
        vs = self.cfg.volume_spike
        n = vs.bars
        if len(bars) < n * 5:
            return False
        recent = bars[-n:]
        if recent[0].ts <= opened_at:
            return False  # only spikes after entry (the entry signal itself often has high volume)
        history = np.array([b.volume for b in bars[:-n]][-n * 20:])
        if len(history) < n:
            return False
        avg_n = float(history.mean()) * n
        if avg_n <= 0:
            return False
        recent_vol = sum(b.volume for b in recent)
        first = bars[-n - 1].close
        change_pct = abs(recent[-1].close - first) / first * 100 if first else 0.0
        return recent_vol > vs.mult * avg_n and change_pct < vs.stall_pct
