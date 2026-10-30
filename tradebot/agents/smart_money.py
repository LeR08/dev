"""Smart-money agent.

* Kraken: exchange balances of the coin falling (coins withdrawn: accumulation) -> LONG;
  rising (coins deposited to be sold) -> SHORT. For coins without their own data,
  stablecoins arriving on exchanges (buying power) -> LONG, leaving -> SHORT.
  Flows come from balance snapshots, so they need ~half a window of history first.
* IBKR: insider cluster buying (several Form 4 / AMF declarations in a short
  window) -> LONG; heavy insider selling -> SHORT.

A SHORT vote also blocks any LONG entry (opposite votes cancel in the consensus).
"""

from __future__ import annotations

from tradebot.agents.base import Direction, Snapshot, Vote

NAME = "smart_money"


def _asset_vote(f, cfg: dict) -> Vote | None:
    min_eur = float(cfg.get("min_net_flow_eur", 5_000_000))
    min_pct = float(cfg.get("min_net_flow_pct", 0.5))
    net, pct = f.net_outflow_eur, f.net_outflow_pct
    detail = (f"{f.window_hours}h exchange balance of {f.asset}: {'-' if net > 0 else '+'}"
              f"{abs(f.outflow - f.inflow):,.2f} ({'' if pct is None else f'{-pct:+.2f}% , '}{-net:+,.0f} EUR)")
    strong = abs(net) >= min_eur and (pct is None or abs(pct) >= min_pct)
    if not strong:
        return Vote.none(NAME, detail)
    scale = abs(pct) / min_pct if pct else abs(net) / min_eur
    conf = round(min(1.0, 0.5 + 0.2 * (scale - 1)), 3)
    if net > 0:
        return Vote(NAME, Direction.LONG, conf, "coins leaving exchanges (accumulation): " + detail)
    return Vote(NAME, Direction.SHORT, conf, "coins arriving on exchanges (selling pressure): " + detail)


def _market_vote(m, cfg: dict) -> Vote | None:
    if m is None or not cfg.get("stablecoin_signal", True):
        return None
    min_eur = float(cfg.get("stable_min_flow_eur", 100_000_000))
    into = (m.inflow - m.outflow) * m.price_eur  # stablecoins deposited on exchanges
    detail = f"{m.window_hours}h stablecoins on exchanges {into:+,.0f} EUR"
    if into >= min_eur:
        return Vote(NAME, Direction.LONG, 0.4, "buying power arriving: " + detail)
    if -into >= min_eur:
        return Vote(NAME, Direction.SHORT, 0.4, "buying power leaving: " + detail)
    return Vote.none(NAME, detail)


def _vote_kraken(snap: Snapshot, cfg: dict) -> Vote:
    own = _asset_vote(snap.onchain, cfg) if snap.onchain is not None else None
    market = _market_vote(snap.market_flow, cfg)
    if own is not None and own.direction != Direction.NONE:
        if market is not None and market.direction == own.direction:
            return Vote(NAME, own.direction, round(min(1.0, own.confidence + 0.15), 3),
                        own.reason + "; confirmed by " + market.reason)
        return own
    if market is not None and market.direction != Direction.NONE:
        return market
    reasons = [v.reason for v in (own, market) if v is not None]
    return Vote.none(NAME, "; ".join(reasons) or "no on-chain history yet (balance snapshots building up)")


def _vote_ibkr(snap: Snapshot, cfg: dict) -> Vote:
    act = snap.insider
    if act is None:
        return Vote.none(NAME, "no insider data")
    ignore_planned = bool(cfg.get("ignore_planned_sales", True))
    buys = [t for t in act.txns if t.side == "buy"]
    sells = [t for t in act.txns if t.side == "sell" and not (ignore_planned and t.planned)]
    buyers = {t.insider for t in buys}
    sellers = {t.insider for t in sells}
    buy_val = sum(t.value for t in buys)
    sell_val = sum(t.value for t in sells)
    detail = (f"{act.window_days}d: {len(buyers)} insiders bought {buy_val:,.0f}, "
              f"{len(sellers)} sold {sell_val:,.0f}")
    if act.institutional_change_pct is not None:
        detail += f"; 13F holdings {act.institutional_change_pct:+.1f}% QoQ"

    if len(sellers) >= int(cfg.get("heavy_sell_min_insiders", 3)) and sell_val >= float(cfg.get("heavy_sell_value", 2e6)) \
            and sell_val > buy_val:
        return Vote(NAME, Direction.SHORT, round(min(1.0, 0.5 + 0.1 * len(sellers)), 3),
                    "heavy insider selling: " + detail)
    if len(buyers) >= int(cfg.get("cluster_min_insiders", 3)) and buy_val >= float(cfg.get("min_buy_value", 1e5)) \
            and buy_val > sell_val:
        conf = 0.5 + 0.1 * (len(buyers) - int(cfg.get("cluster_min_insiders", 3)))
        if act.institutional_change_pct is not None:
            conf += 0.1 if act.institutional_change_pct > 0 else -0.1
        return Vote(NAME, Direction.LONG, round(max(0.1, min(1.0, conf)), 3), "insider cluster buying: " + detail)
    return Vote.none(NAME, detail)


def vote(snap: Snapshot, cfg: dict) -> Vote:
    if snap.broker == "kraken":
        return _vote_kraken(snap, cfg)
    return _vote_ibkr(snap, cfg)
