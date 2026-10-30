from __future__ import annotations

from datetime import timedelta

import numpy as np
import pytest

from tradebot.agents import arbitrage, convergence, smart_money
from tradebot.agents.base import Direction, InsiderActivity, InsiderTxn, OnchainFlow, Snapshot, Vote
from tradebot.agents.pool import AgentPool
from tradebot.brokers.base import Quote
from tradebot.engine.consensus import decide
from tradebot.settings import ConsensusCfg
from tradebot.tests.fakes import T0, make_bars


def snap(**kw) -> Snapshot:
    base = dict(broker="kraken", symbol="ETH/EUR", ts=T0, bars=())
    base.update(kw)
    return Snapshot(**base)


def test_triangular_arbitrage_needs_edge_after_fees():
    q = Quote("ETH/EUR", 2999, 3000, 3000)
    related = {"ETH/BTC": Quote("ETH/BTC", 0.051, 0.0511, 0.051), "BTC/EUR": Quote("BTC/EUR", 60000, 60010, 60005)}
    cfg = {"bridges": ["BTC"], "min_edge_bps": 15, "slippage_bps": 5}
    v = arbitrage.vote(snap(quote=q, related_quotes=related, taker_fee=0.0026), cfg)
    assert v.direction == Direction.LONG and v.target_price == 0.051 * 60000  # 2 % gross edge survives
    fair = {"ETH/BTC": Quote("ETH/BTC", 0.05, 0.0501, 0.05), "BTC/EUR": Quote("BTC/EUR", 60000, 60010, 60005)}
    v = arbitrage.vote(snap(quote=q, related_quotes=fair, taker_fee=0.0026), cfg)
    assert v.direction == Direction.NONE  # 0 % gross edge does not survive 3 fees


def test_pair_trading_longs_cheap_and_shorts_rich_leg():
    rng = np.random.default_rng(1)
    b = 100 * np.exp(np.cumsum(rng.normal(0, 0.01, 80)))
    a = b * np.exp(rng.normal(0, 0.002, 80))
    a[-1] *= 0.97  # A suddenly cheap vs B
    bars_a, bars_b = make_bars(list(a), step=timedelta(days=1)), make_bars(list(b), step=timedelta(days=1))
    s = Snapshot("ibkr", "KO", T0, tuple(bars_a), related_bars={"PEP": tuple(bars_b)}, pair_partners=("PEP",))
    v = arbitrage.vote(s, {"lookback": 60, "z_entry": 2.0})
    assert v.direction == Direction.LONG and v.target_price > a[-1]
    s2 = Snapshot("ibkr", "PEP", T0, tuple(bars_b), related_bars={"KO": tuple(bars_a)}, pair_partners=("KO",))
    assert arbitrage.vote(s2, {"lookback": 60, "z_entry": 2.0}).direction == Direction.SHORT  # rich leg


def test_convergence_requires_deviation_and_volume():
    closes = [100.0 + (i % 3 - 1) * 0.2 for i in range(60)] + [97.0]
    vols = [100.0] * 60 + [300.0]
    cfg = {"window": 48, "k_std": 2.0, "volume_mult": 1.5, "volume_window": 48, "reference": "sma"}
    v = convergence.vote(snap(bars=tuple(make_bars(closes, vols))), cfg)
    assert v.direction == Direction.LONG and v.target_price > 97
    v = convergence.vote(snap(bars=tuple(make_bars(closes, [100.0] * 61))), cfg)
    assert v.direction == Direction.NONE and "volume" in v.reason


def test_smart_money_onchain():
    cfg = {"min_net_flow_eur": 1_000_000}
    out = OnchainFlow("BTC", inflow=1, outflow=40, window_hours=24, price_eur=60000)
    assert smart_money.vote(snap(onchain=out), cfg).direction == Direction.LONG
    inn = OnchainFlow("BTC", inflow=40, outflow=1, window_hours=24, price_eur=60000)
    assert smart_money.vote(snap(onchain=inn), cfg).direction == Direction.SHORT
    assert smart_money.vote(snap(), cfg).direction == Direction.NONE


def test_smart_money_insiders():
    cfg = {"cluster_min_insiders": 3, "min_buy_value": 100_000, "heavy_sell_value": 1_000_000,
           "heavy_sell_min_insiders": 2, "ignore_planned_sales": True}
    buys = tuple(InsiderTxn(T0, f"D{i}", "buy", 1000, 50) for i in range(3))
    s = Snapshot("ibkr", "AAPL", T0, (), insider=InsiderActivity(14, buys))
    assert smart_money.vote(s, cfg).direction == Direction.LONG
    sells = tuple(InsiderTxn(T0, f"D{i}", "sell", 10_000, 100) for i in range(3))
    s = Snapshot("ibkr", "AAPL", T0, (), insider=InsiderActivity(14, sells))
    assert smart_money.vote(s, cfg).direction == Direction.SHORT
    planned = tuple(InsiderTxn(T0, f"D{i}", "sell", 10_000, 100, planned=True) for i in range(3))
    s = Snapshot("ibkr", "AAPL", T0, (), insider=InsiderActivity(14, planned))
    assert smart_money.vote(s, cfg).direction == Direction.NONE


def test_consensus_table():
    L = lambda a: Vote(a, Direction.LONG, 0.7, "", 110.0)  # noqa: E731
    N = lambda a: Vote.none(a, "")  # noqa: E731
    A = lambda a: Vote(a, Direction.AVOID, 0.9, "")  # noqa: E731
    cfg = ConsensusCfg(solo_agents=["a", "b", "c"])
    assert decide([L("a"), L("b"), A("c")]).size_factor == 0
    assert decide([L("a"), L("b"), L("c")]).size_factor == 1.0
    assert decide([L("a"), L("b"), N("c")]).label == "full"
    assert decide([L("a"), N("b"), N("c")], cfg).size_factor == 0.5
    assert decide([N("a"), N("b"), N("c")]).size_factor == 0
    S = lambda a: Vote(a, Direction.SHORT, 0.7, "", 90.0)  # noqa: E731
    d = decide([S("a"), S("b"), N("c")])
    assert d.label == "full" and d.side.value == "short" and d.target_price == 90.0
    assert decide([S("a"), N("b"), N("c")], cfg).size_factor == 0.5
    assert decide([L("a"), S("b"), N("c")]).size_factor == 0  # conflicting directions
    assert decide([S("a"), S("b"), A("c")]).size_factor == 0
    sm = Vote("smart_money", Direction.LONG, 0.9, "")
    assert decide([sm, N("b"), N("c")]).size_factor == 0  # smart money alone only confirms
    assert decide([sm, Vote("convergence", Direction.LONG, 0.6, "", 110.0), N("c")]).label == "full"


async def test_agents_run_in_separate_processes():
    pool = AgentPool(isolated=True)
    try:
        votes = await pool.votes(snap(bars=tuple(make_bars([100.0] * 60))), {})
        assert [v.agent for v in votes] == ["arbitrage", "convergence", "smart_money", "trend"]
        pids = {ex._processes and next(iter(ex._processes)) for ex in pool._executors.values()}
        assert len(pids) == 4  # one worker process per agent
    finally:
        pool.shutdown()


def test_agent_errors_become_none():
    from tradebot.agents.pool import safe_vote

    v = safe_vote("convergence", snap(bars=tuple(make_bars([100.0] * 60))), {"window": "bad"})
    assert v.direction == Direction.NONE and "error" in v.reason


def test_triangle_uses_inverted_cross_pair():
    # BTC/EUR via ETH: Kraken lists ETH/BTC, not BTC/ETH
    q = Quote("BTC/EUR", 59_000, 59_010, 59_005)
    related = {"ETH/BTC": Quote("ETH/BTC", 0.0499, 0.05, 0.05), "ETH/EUR": Quote("ETH/EUR", 3_060, 3_061, 3_060)}
    v = arbitrage.vote(snap(symbol="BTC/EUR", quote=q, related_quotes=related, taker_fee=0.0026),
                       {"bridges": ["BTC", "ETH"], "min_edge_bps": 15, "slippage_bps": 5})
    assert v.direction == Direction.LONG and "via" not in v.reason and v.target_price > 59_010


def test_convergence_shorts_spikes_above_reference():
    closes = [100.0 + (i % 3 - 1) * 0.2 for i in range(60)] + [103.0]
    vols = [100.0] * 60 + [300.0]
    cfg = {"window": 48, "k_std": 2.0, "volume_mult": 1.5, "volume_window": 48, "reference": "sma"}
    v = convergence.vote(snap(bars=tuple(make_bars(closes, vols))), cfg)
    assert v.direction == Direction.SHORT and v.target_price < 103


def test_triangle_short_when_pair_is_rich():
    q = Quote("ETH/EUR", 3100, 3101, 3100)  # ETH/EUR rich vs 0.05 x 60000 = 3000
    related = {"ETH/BTC": Quote("ETH/BTC", 0.0499, 0.05, 0.05), "BTC/EUR": Quote("BTC/EUR", 59_990, 60_000, 60_000)}
    v = arbitrage.vote(snap(quote=q, related_quotes=related, taker_fee=0.0026),
                       {"bridges": ["BTC"], "min_edge_bps": 15, "slippage_bps": 5})
    assert v.direction == Direction.SHORT and v.target_price == pytest.approx(3000)


def test_trend_breakout_long_and_short():
    from tradebot.agents import trend

    up = [100.0 * (1.004 ** i) for i in range(160)] + [100.0 * (1.004 ** 160) * 1.03]
    v = trend.vote(snap(symbol="BTC/USD", bars=tuple(make_bars(up))), {})
    assert v.direction == Direction.LONG and v.target_price is None
    down = [100.0 * (0.996 ** i) for i in range(160)] + [100.0 * (0.996 ** 160) * 0.97]
    assert trend.vote(snap(symbol="BTC/USD", bars=tuple(make_bars(down))), {}).direction == Direction.SHORT
    flat = [100.0 + (i % 5) for i in range(160)]
    assert trend.vote(snap(symbol="BTC/USD", bars=tuple(make_bars(flat))), {}).direction == Direction.NONE


def test_exchange_netflow_from_balance_snapshots():
    from datetime import timedelta as td

    from tradebot.data.onchain import netflow_from_snapshots

    rows = [(T0, {"wallets": {"a": 1000.0, "b": 500.0}}),
            (T0 + td(hours=12), {"wallets": {"a": 990.0, "b": 500.0}}),
            (T0 + td(hours=24), {"wallets": {"a": 970.0, "b": 480.0, "new": 9999.0}})]
    net, total, span = netflow_from_snapshots(rows, td(hours=24), T0 + td(hours=24))
    assert net == -50.0 and span == 24 and total == 1450.0  # a wallet added later is ignored
    assert netflow_from_snapshots(rows[:1], td(hours=24), T0) is None
    assert netflow_from_snapshots(rows[:2], td(hours=48), T0 + td(hours=12)) is None  # history too short


def test_smart_money_balance_and_stablecoin_signals():
    cfg = {"min_net_flow_eur": 1_000_000, "min_net_flow_pct": 0.5, "stable_min_flow_eur": 100_000_000}
    leaving = OnchainFlow("BTC", 0, 3000, 24, 60_000, exchange_balance=500_000)  # -0.6 % of exchange balance
    assert smart_money.vote(snap(symbol="BTC/USD", onchain=leaving), cfg).direction == Direction.LONG
    small = OnchainFlow("BTC", 0, 1000, 24, 60_000, exchange_balance=500_000)  # 0.2 %: noise
    assert smart_money.vote(snap(symbol="BTC/USD", onchain=small), cfg).direction == Direction.NONE
    arriving = OnchainFlow("BTC", 4000, 0, 24, 60_000, exchange_balance=500_000)
    assert smart_money.vote(snap(symbol="BTC/USD", onchain=arriving), cfg).direction == Direction.SHORT
    stables_in = OnchainFlow("STABLES", 300e6, 0, 24, 0.92, exchange_balance=40e9)
    v = smart_money.vote(snap(symbol="SOL/USD", market_flow=stables_in), cfg)
    assert v.direction == Direction.LONG and v.confidence == 0.4
    both = smart_money.vote(snap(symbol="BTC/USD", onchain=leaving, market_flow=stables_in), cfg)
    assert both.direction == Direction.LONG and "confirmed" in both.reason


def test_profiles():
    from tradebot.engine.profiles import apply_profile
    from tradebot.settings import load_config

    cfg = load_config()
    apply_profile(cfg, "normal")
    changes = apply_profile(cfg, "aggressive")
    assert cfg.risk.kraken.risk_per_trade_pct == 1.5 and cfg.risk.kraken.max_leverage == 3
    assert cfg.strategy.kraken.leverage.full_consensus_only and changes
    apply_profile(cfg, "normal")
    assert cfg.risk.kraken.risk_per_trade_pct == 0.5 and cfg.risk.kraken.max_leverage == 2
    with pytest.raises(KeyError):
        apply_profile(cfg, "yolo")
