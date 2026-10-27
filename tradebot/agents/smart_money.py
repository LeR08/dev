"""Smart-money agent.

* Kraken: large outflows from labelled exchange wallets (accumulation) -> LONG;
  large inflows to exchanges (likely selling) -> AVOID.
* IBKR: insider cluster buying (several Form 4 / AMF declarations in a short
  window) -> LONG; heavy insider selling -> AVOID.
"""

from __future__ import annotations

from tradebot.agents.base import Direction, Snapshot, Vote

NAME = "smart_money"


def _vote_kraken(snap: Snapshot, cfg: dict) -> Vote:
    f = snap.onchain
    if f is None:
        return Vote.none(NAME, "no on-chain data for this asset")
    threshold = float(cfg.get("min_net_flow_eur", 5_000_000))
    net = f.net_outflow_eur
    detail = (f"{f.window_hours}h exchange flows: out {f.outflow:,.2f} ({f.n_out} tx) / in {f.inflow:,.2f} "
              f"({f.n_in} tx) {f.asset}, net {net:,.0f} EUR")
    if net >= threshold:
        return Vote(NAME, Direction.LONG, round(min(1.0, 0.5 + 0.25 * (net / threshold - 1)), 3),
                    "accumulation: " + detail)
    if -net >= threshold:
        return Vote(NAME, Direction.AVOID, round(min(1.0, 0.5 + 0.25 * (-net / threshold - 1)), 3),
                    "exchange inflows: " + detail)
    return Vote.none(NAME, detail)


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
        return Vote(NAME, Direction.AVOID, round(min(1.0, 0.5 + 0.1 * len(sellers)), 3), "heavy insider selling: " + detail)
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
