"""Risk profiles: one switch for a coherent set of limits.

* normal: 0.5 % of capital at risk per trade, leverage capped at 2x.
* aggressive: 1.5 % per trade, bigger positions, up to 3x leverage, wider loss
  limits; leverage is only used when the chart AND the on-chain data agree
  (full consensus). Losses grow as fast as gains: drawdowns roughly triple.
"""

from __future__ import annotations

from tradebot.settings import AppConfig

PROFILES: dict[str, dict] = {
    "normal": {
        "risk": dict(risk_per_trade_pct=0.5, max_position_pct_full=10.0, max_position_pct_half=5.0,
                     max_open_positions=5, max_exposure_pct=60.0, max_leverage=2,
                     daily_loss_limit_pct=3.0, max_drawdown_pct=15.0),
        "leverage": dict(target_daily_vol_pct=2.0, full_consensus_only=False),
        "trade_plan": dict(min_reward_risk=1.5),
    },
    "aggressive": {
        "risk": dict(risk_per_trade_pct=1.5, max_position_pct_full=25.0, max_position_pct_half=12.5,
                     max_open_positions=8, max_exposure_pct=150.0, max_leverage=3,
                     daily_loss_limit_pct=6.0, max_drawdown_pct=25.0),
        "leverage": dict(target_daily_vol_pct=10.0, full_consensus_only=True),
        "trade_plan": dict(min_reward_risk=1.25),
    },
}


def apply_profile(cfg: AppConfig, name: str) -> list[str]:
    """Apply a profile to the (live) config; returns the changes made."""
    if name not in PROFILES:
        raise KeyError(f"unknown profile '{name}' ({', '.join(PROFILES)})")
    p = PROFILES[name]
    changes = []
    for broker in ("kraken", "ibkr"):
        rc = cfg.risk.for_broker(broker)
        for k, v in p["risk"].items():
            if getattr(rc, k) != v:
                changes.append(f"{broker}.{k}: {getattr(rc, k)} -> {v}")
                setattr(rc, k, v)
        lev = getattr(cfg.strategy, broker).leverage
        for k, v in p["leverage"].items():
            if getattr(lev, k) != v:
                changes.append(f"{broker}.leverage.{k}: {getattr(lev, k)} -> {v}")
                setattr(lev, k, v)
    for k, v in p["trade_plan"].items():
        if getattr(cfg.strategy.trade_plan, k) != v:
            changes.append(f"trade_plan.{k}: {getattr(cfg.strategy.trade_plan, k)} -> {v}")
            setattr(cfg.strategy.trade_plan, k, v)
    cfg.risk.profile = name
    return changes
