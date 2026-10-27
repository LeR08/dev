from __future__ import annotations

from datetime import timedelta

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
