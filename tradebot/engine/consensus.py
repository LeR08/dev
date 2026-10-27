"""Consensus rule: turns the three votes into a direction and a position size factor.

| Votes                                   | Decision              |
|-----------------------------------------|-----------------------|
| any AVOID                               | no trade              |
| LONG and SHORT votes at the same time   | no trade (conflict)   |
| 2 or 3 votes in the same direction      | full size             |
| 1 directional vote, others NONE         | half size             |
| no directional vote                     | no trade              |
"""

from __future__ import annotations

from dataclasses import dataclass

from tradebot.agents.base import Direction, Vote
from tradebot.brokers.base import PositionSide
from tradebot.settings import ConsensusCfg


@dataclass(frozen=True)
class ConsensusDecision:
    label: str  # full / half / none
    size_factor: float
    reason: str
    target_price: float | None = None
    entering_agents: tuple[str, ...] = ()
    side: PositionSide | None = None

    @property
    def trade(self) -> bool:
        return self.size_factor > 0 and self.side is not None


def decide(votes: list[Vote], cfg: ConsensusCfg | None = None) -> ConsensusDecision:
    cfg = cfg or ConsensusCfg()
    avoid = [v for v in votes if v.direction == Direction.AVOID]
    if avoid:
        return ConsensusDecision("none", 0.0, "AVOID from " + ", ".join(v.agent for v in avoid))
    longs = [v for v in votes if v.direction == Direction.LONG]
    shorts = [v for v in votes if v.direction == Direction.SHORT]
    if longs and shorts:
        return ConsensusDecision("none", 0.0, f"conflict: LONG ({', '.join(v.agent for v in longs)}) vs "
                                              f"SHORT ({', '.join(v.agent for v in shorts)})")
    voters = longs or shorts
    if not voters:
        return ConsensusDecision("none", 0.0, "no directional vote")
    side = PositionSide.LONG if longs else PositionSide.SHORT
    word = "LONG" if longs else "SHORT"
    with_target = [v for v in voters if v.target_price]
    target = max(with_target, key=lambda v: v.confidence).target_price if with_target else None
    agents = tuple(v.agent for v in voters)
    if len(voters) >= cfg.full_size_min_long:
        return ConsensusDecision("full", 1.0, f"{len(voters)} {word} votes ({', '.join(agents)})", target, agents, side)
    return ConsensusDecision("half", cfg.half_size_factor, f"1 {word} vote ({agents[0]})", target, agents, side)
