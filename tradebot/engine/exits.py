"""Exit logic: a position closes on the first condition met.

The stop-loss also lives at the broker (Kraken conditional close / IBKR bracket
child) so a bot crash never leaves a position unprotected.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

import numpy as np

from tradebot.agents.base import Direction, Vote
from tradebot.brokers.base import Bar
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


@dataclass
class PositionView:
    symbol: str
    entry_price: float
    target_price: float | None
    stop_price: float | None
    opened_at: datetime


def take_profit_price(entry: float, target: float | None, fraction: float) -> float | None:
    if target is None or target <= entry:
        return None
    return entry + fraction * (target - entry)


class ExitManager:
    def __init__(self, cfg: ExitsCfg, broker: str):
        self.cfg = cfg
        self.broker = broker

    def evaluate(self, pos: PositionView, price: float, bars: list[Bar] | tuple[Bar, ...],
                 smart_vote: Vote | None, now: datetime) -> ExitReason | None:
        tp = take_profit_price(pos.entry_price, pos.target_price, self.cfg.take_profit_fraction)
        if tp is not None and price >= tp:
            return ExitReason.TAKE_PROFIT
        if self._volume_spike(bars, pos.opened_at):
            return ExitReason.VOLUME_SPIKE
        if smart_vote is not None and smart_vote.direction == Direction.AVOID:
            return ExitReason.SMART_MONEY
        if pos.stop_price is not None and price <= pos.stop_price:
            return ExitReason.STOP_LOSS
        max_h = self.cfg.max_holding_hours.get(self.broker)
        if max_h is not None and now - pos.opened_at >= timedelta(hours=max_h):
            return ExitReason.TIME_STOP
        return None

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
