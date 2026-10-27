"""Consensus rule: turns the three votes into a position size factor.

| Votes                         | Decision       |
|-------------------------------|----------------|
| any AVOID                     | no trade       |
| 2 or 3 LONG                   | full size      |
| 1 LONG, others NONE           | half size      |
| 0 LONG                        | no trade       |
"""

from __future__ import annotations

from dataclasses import dataclass

from tradebot.agents.base import Direction, Vote
from tradebot.settings import ConsensusCfg


@dataclass(frozen=True)
class ConsensusDecision:
    label: str  # full / half / none
    size_factor: float
    reason: str
    target_price: float | None = None
    entering_agents: tuple[str, ...] = ()

    @property
    def trade(self) -> bool:
        return self.size_factor > 0


def decide(votes: list[Vote], cfg: ConsensusCfg | None = None) -> ConsensusDecision:
    cfg = cfg or ConsensusCfg()
    avoid = [v for v in votes if v.direction == Direction.AVOID]
    if avoid:
        return ConsensusDecision("none", 0.0, "AVOID from " + ", ".join(v.agent for v in avoid))
    longs = [v for v in votes if v.direction == Direction.LONG]
    if not longs:
        return ConsensusDecision("none", 0.0, "no LONG vote")
    with_target = [v for v in longs if v.target_price]
    target = max(with_target, key=lambda v: v.confidence).target_price if with_target else None
    agents = tuple(v.agent for v in longs)
    if len(longs) >= cfg.full_size_min_long:
        return ConsensusDecision("full", 1.0, f"{len(longs)} LONG votes ({', '.join(agents)})", target, agents)
    return ConsensusDecision("half", cfg.half_size_factor, f"1 LONG vote ({agents[0]})", target, agents)
