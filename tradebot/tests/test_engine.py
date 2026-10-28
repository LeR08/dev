from __future__ import annotations

from datetime import timedelta

import pytest

from tradebot.agents.base import Direction, Vote
from tradebot.brokers.base import Broker, OrderBook, Quote
from tradebot.engine.exits import ExitManager, ExitReason, PositionView, take_profit_price
from tradebot.engine.scanner import InstrumentSnapshot, Scanner
from tradebot.settings import ExitsCfg, IBKRScannerCfg, KrakenScannerCfg
from tradebot.tests.fakes import T0, make_bars


def book(depth_eur):
    return OrderBook("X/EUR", ((100.0, depth_eur / 100),), ((100.1, depth_eur / 100.1),))


def test_kraken_scanner_filters_and_reasons():
    sc = Scanner(Broker.KRAKEN, KrakenScannerCfg(max_spread_bps=30, min_depth_eur=10_000,
                                                 low_liquidity_hours_utc=[3]))
    snaps = [
        InstrumentSnapshot("A/EUR", Quote("A/EUR", 100, 100.1, 100), book(50_000)),
        InstrumentSnapshot("B/EUR", Quote("B/EUR", 100, 101, 100), book(50_000)),  # spread 100 bps
        InstrumentSnapshot("C/EUR", Quote("C/EUR", 100, 100.1, 100), book(1_000)),  # thin
        InstrumentSnapshot("D/EUR", None),
    ]
    r = sc.scan(snaps, T0.replace(hour=12))
    assert r.passed == ["A/EUR"]
    assert r.rejected["B/EUR"].startswith("spread") and r.rejected["C/EUR"].startswith("depth")
    assert r.pass_rate == 0.25 and dict(r.top_reasons())["no_quote"] == 1
    r = sc.scan(snaps[:1], T0.replace(hour=3))
    assert r.rejected["A/EUR"].startswith("time_window")


def test_ibkr_scanner_time_windows_and_earnings():
    sc = Scanner(Broker.IBKR, IBKRScannerCfg(min_avg_daily_volume=1000, avoid_open_close_minutes=15))
    start = T0.replace(hour=13, minute=30)
    sess = (start, start + timedelta(hours=6, minutes=30))
    q = Quote("AAPL", 100, 100.05, 100)
    ok = InstrumentSnapshot("AAPL", q, None, 5000, sess, True)
    assert sc.scan([ok], start + timedelta(minutes=5)).rejected["AAPL"].startswith("time_window")
    assert sc.scan([ok], start + timedelta(hours=1)).passed == ["AAPL"]
    assert sc.scan([ok], sess[1] - timedelta(minutes=5)).rejected["AAPL"].startswith("time_window")
    earn = InstrumentSnapshot("AAPL", q, None, 5000, sess, True, frozenset({start.date()}))
    assert sc.scan([earn], start + timedelta(hours=1)).rejected["AAPL"].startswith("earnings")
    thin = InstrumentSnapshot("AAPL", q, None, 10, sess, True)
    assert sc.scan([thin], start + timedelta(hours=1)).rejected["AAPL"].startswith("volume")


def test_exit_rules_in_order():
    em = ExitManager(ExitsCfg(), "kraken")
    pos = PositionView("X/EUR", 100.0, 110.0, 97.0, T0)
    assert take_profit_price(100, 110, 0.85) == 108.5
    assert em.evaluate(pos, 108.6, [], None, T0) == ExitReason.TAKE_PROFIT
    assert em.evaluate(pos, 105, [], None, T0) is None
    avoid = Vote("smart_money", Direction.AVOID, 0.8, "")
    assert em.evaluate(pos, 105, [], avoid, T0) == ExitReason.SMART_MONEY
    assert em.evaluate(pos, 96.9, [], None, T0) == ExitReason.STOP_LOSS
    assert em.evaluate(pos, 101, [], None, T0 + timedelta(hours=73)) == ExitReason.TIME_STOP
    bars = make_bars([100.0] * 40, [10.0] * 37 + [100.0] * 3, start=T0 - timedelta(hours=9))
    assert em.evaluate(pos, 101, bars, None, T0) == ExitReason.VOLUME_SPIKE  # spike after entry, price stalls
    late = PositionView("X/EUR", 100.0, 110.0, 97.0, bars[-2].ts)
    assert em.evaluate(late, 101, bars, None, T0) is None  # spike that started before entry is ignored


def test_auto_leverage_from_volatility():
    import numpy as np

    from tradebot.engine.leverage import auto_leverage, realised_daily_vol_pct
    from tradebot.settings import LeverageCfg

    rng = np.random.default_rng(0)
    calm = make_bars(list(100 * np.exp(np.cumsum(rng.normal(0, 0.0005, 100)))))
    wild = make_bars(list(100 * np.exp(np.cumsum(rng.normal(0, 0.01, 100)))))
    cfg = LeverageCfg(target_daily_vol_pct=2.0, vol_lookback_bars=96)
    assert realised_daily_vol_pct(calm, 96) < realised_daily_vol_pct(wild, 96)
    assert auto_leverage(calm, cfg, 3.0, 1.0)[0] == 3.0  # calm: capped at max
    assert auto_leverage(wild, cfg, 3.0, 1.0)[0] == 1.0  # ~10 %/day: no leverage
    assert auto_leverage(calm, cfg, 3.0, 0.5)[0] == 3.0  # half-size signals may use leverage by default
    strict = LeverageCfg(target_daily_vol_pct=2.0, vol_lookback_bars=96, full_consensus_only=True)
    assert auto_leverage(calm, strict, 3.0, 0.5)[0] == 1.0
    assert auto_leverage(calm, LeverageCfg(enabled=False), 3.0, 1.0)[0] == 1.0


def test_short_exit_rules():
    from tradebot.brokers.base import PositionSide

    em = ExitManager(ExitsCfg(), "kraken")
    pos = PositionView("X/EUR", 100.0, 90.0, 103.0, T0, PositionSide.SHORT)
    assert take_profit_price(100, 90, 0.85, PositionSide.SHORT) == 91.5
    assert em.evaluate(pos, 91.4, [], None, T0) == ExitReason.TAKE_PROFIT
    assert em.evaluate(pos, 103.1, [], None, T0) == ExitReason.STOP_LOSS
    long_vote = Vote("smart_money", Direction.LONG, 0.8, "")
    assert em.evaluate(pos, 99, [], long_vote, T0) == ExitReason.SMART_MONEY
    assert em.evaluate(pos, 99, [], None, T0) is None


def test_trade_plan_atr_stop_and_reward_risk():
    from tradebot.brokers.base import Fees, PositionSide
    from tradebot.engine.planning import atr, plan_trade
    from tradebot.settings import TradePlanCfg

    bars = make_bars([100.0] * 30)  # high/low +-0.1 % -> ATR 0.2
    assert atr(bars, 14) == pytest.approx(0.2, rel=0.01)
    fees = Fees(0.0025, 0.004)
    cfg = TradePlanCfg(min_reward_risk=1.5, stop_atr_mult=2.5, min_stop_pct=0.5)
    plan, why = plan_trade(PositionSide.LONG, 100.0, 105.0, bars, cfg, 3.0, 0.85, fees)
    assert plan and plan.stop == pytest.approx(99.5)  # 2.5 x 0.2 = 0.5 = min stop 0.5 %
    assert plan.take_profit == pytest.approx(104.25)
    plan, why = plan_trade(PositionSide.LONG, 100.0, 101.0, bars, cfg, 3.0, 0.85, fees)
    assert plan is None and "reward/risk" in why  # 0.85 % target vs 0.65 % fees
    short, _ = plan_trade(PositionSide.SHORT, 100.0, 95.0, bars, cfg, 3.0, 0.85, fees)
    assert short and short.stop > 100


def test_trailing_stop_breakeven_then_atr():
    from tradebot.brokers.base import PositionSide

    em = ExitManager(ExitsCfg(), "kraken")
    pos = PositionView("X/EUR", 100.0, 110.0, 98.0, T0, PositionSide.LONG, 98.0)
    assert em.trailing_stop(pos, 101.0, 0.5) is None  # +0.5 R
    assert em.trailing_stop(pos, 102.2, 2.0, 0.0065) == pytest.approx(100.65)  # break-even + fees
    assert em.trailing_stop(pos, 106.0, 1.0, 0.0065) == pytest.approx(104.0)  # ATR trail wins
    short = PositionView("X/EUR", 100.0, 90.0, 102.0, T0, PositionSide.SHORT, 102.0)
    assert em.trailing_stop(short, 97.5, 2.0, 0.0) == pytest.approx(100.0)


def test_volume_spike_exit_only_protects_gains():
    em = ExitManager(ExitsCfg(), "kraken")
    bars = make_bars([100.0] * 40, [10.0] * 37 + [100.0] * 3, start=T0 - timedelta(hours=9))
    pos = PositionView("X/EUR", 100.0, 110.0, 97.0, T0)
    assert em.evaluate(pos, 101, bars, None, T0) == ExitReason.VOLUME_SPIKE
    assert em.evaluate(pos, 99.5, bars, None, T0) is None  # losing: the stop handles it
