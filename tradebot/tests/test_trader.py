"""Integration: full cycle on fake brokers, exits, kill switch, automatic fallback."""

from __future__ import annotations

import time

import pytest

from tradebot.brokers.base import Broker, Mode, OrderType, Side
from tradebot.engine.mode import Precondition, confirm_phrase
from tradebot.tests.fakes import make_bars


def setup_dip(bot):
    """BTC/EUR far below its VWAP on high volume -> convergence votes LONG (half size)."""
    k = bot.adapters[Broker.KRAKEN]
    closes = [60_000.0 + (i % 3 - 1) * 50 for i in range(60)] + [57_000.0]  # -5 %: target far enough to pay fees
    vols = [10.0] * 60 + [40.0]
    k.bars["BTC/EUR"] = make_bars(closes, vols)
    k.set_price("BTC/EUR", 57_000.0)
    return k


async def test_full_cycle_entry_fill_and_take_profit(make_bot):
    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = setup_dip(bot)
    trader = bot.traders[Broker.KRAKEN]
    await trader.start()
    await trader.shutdown()  # we drive cycles manually
    trader.entries_enabled = True
    await trader.cycle()

    entry = [r for r in k.placed if r.side == Side.BUY]
    assert len(entry) == 1 and entry[0].post_only and entry[0].stop_loss < entry[0].limit_price
    assert entry[0].qty * entry[0].limit_price == pytest.approx(1000 * 0.025, rel=0.01)  # half size
    d, votes = bot.db.last_decisions(1)[0]
    assert d.result == "half" and {v.agent for v in votes} == {"arbitrage", "convergence", "smart_money"}
    assert d.mode == "test" and d.broker == "kraken"

    k.set_price("BTC/EUR", 56_900.0)  # ask drops through our bid -> maker fill
    trader.entries_enabled = False
    await trader.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)
    assert len(pos) == 1 and pos[0].stop_price is not None
    assert any(o.order_type == OrderType.STOP_LOSS for o in k.paper.open_orders())  # stop held at "broker"

    k.set_price("BTC/EUR", 60_500.0)  # beyond 85 % of the way to the VWAP target
    await trader.cycle()  # exit limit posted at the ask
    k.set_price("BTC/EUR", 60_700.0)
    await trader.cycle()
    closed = bot.db.closed_positions(Broker.KRAKEN, Mode.TEST)
    assert len(closed) == 1 and closed[0].exit_reason == "take_profit"
    assert closed[0].pnl > 0 and closed[0].fees > 0
    await bot.shutdown()


async def test_kill_closes_everything_within_30s_and_sets_test(make_bot):
    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = setup_dip(bot)
    trader = bot.traders[Broker.KRAKEN]
    await k.connect()
    trader.entries_enabled = True
    await trader.cycle()
    k.set_price("BTC/EUR", 56_900.0)
    trader.entries_enabled = False
    await trader.cycle()
    assert bot.db.open_positions(Broker.KRAKEN, Mode.TEST)
    bot.mode.request_live(Broker.IBKR, confirm_phrase("ibkr"), [Precondition("ok", True)])

    t0 = time.monotonic()
    report = await bot.kill()
    assert time.monotonic() - t0 < 30
    await trader.sync_fills()
    assert not k.paper.open_orders()
    assert not k.paper.positions
    assert bot.db.closed_positions(Broker.KRAKEN, Mode.TEST)[0].exit_reason == "kill_switch"
    assert bot.mode.snapshot() == {"kraken": "test", "ibkr": "test"}
    assert any("all brokers set to TEST" in line for line in report)
    await bot.shutdown()


async def test_order_error_in_live_falls_back_to_test(make_bot):
    bot = make_bot()
    k = bot.adapters[Broker.KRAKEN]
    bot.risk.cfg(Broker.KRAKEN).live_capital_cap_eur = 500
    bot.mode.request_live(Broker.KRAKEN, confirm_phrase("kraken"), [Precondition("ok", True)])

    async def boom(req):
        raise RuntimeError("socket closed")

    k.place_order = boom
    k.set_price("BTC/EUR", 50_000.0)
    from tradebot.brokers.base import OrderRequest
    from tradebot.engine.risk import AccountState

    req = OrderRequest("BTC/EUR", Side.BUY, 0.001, OrderType.LIMIT, limit_price=50_000, reference_price=50_000)
    rd = bot.risk.approve(Broker.KRAKEN, req, AccountState(Broker.KRAKEN, Mode.LIVE, 1000, 1000))
    assert await bot.traders[Broker.KRAKEN].submit(rd.request) is None
    assert bot.mode.mode(Broker.KRAKEN) == Mode.TEST


async def test_daily_loss_limit_closes_and_halts(make_bot):
    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = setup_dip(bot)
    trader = bot.traders[Broker.KRAKEN]
    trader.entries_enabled = True
    await trader.cycle()
    k.set_price("BTC/EUR", 56_900.0)
    trader.entries_enabled = False
    await trader.cycle()
    trader.state.day_start_equity = 2000  # simulate a large loss today
    await trader.cycle()
    assert bot.risk.halt_reason(Broker.KRAKEN) == "daily_loss_limit"
    await trader.sync_fills()
    assert not bot.db.open_positions(Broker.KRAKEN, Mode.TEST)
    assert bot.mode.mode(Broker.KRAKEN) == Mode.TEST


async def test_ibkr_exit_refused_when_market_closed(make_bot):
    bot = make_bot()
    i = bot.adapters[Broker.IBKR]
    i.market_open = False
    bot.db.open_position(broker=Broker.IBKR, mode=Mode.TEST, symbol="AAPL", qty=1, entry_price=100.0,
                         currency="USD", stop_price=97.0)
    i.set_price("AAPL", 100)
    ok = await bot.traders[Broker.IBKR].close_position_row(bot.db.open_positions(Broker.IBKR, Mode.TEST)[0].id,
                                                           "AAPL", "manual_close")
    assert not ok and "market closed" in bot.traders[Broker.IBKR].state.flags["AAPL"]



def setup_spike(bot):
    """BTC/EUR far above its VWAP on high volume -> convergence votes SHORT (half size, 1x)."""
    k = bot.adapters[Broker.KRAKEN]
    closes = [60_000.0 + (i % 3 - 1) * 50 for i in range(100)] + [63_000.0]
    vols = [10.0] * 100 + [40.0]
    k.bars["BTC/EUR"] = make_bars(closes, vols)
    k.set_price("BTC/EUR", 63_000.0)
    return k


async def test_short_cycle_entry_and_take_profit(make_bot):
    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = setup_spike(bot)
    trader = bot.traders[Broker.KRAKEN]
    trader.entries_enabled = True
    await trader.cycle()
    entry = [r for r in k.placed if r.purpose.value == "entry"]
    assert len(entry) == 1 and entry[0].side == Side.SELL and entry[0].stop_loss > entry[0].limit_price
    assert entry[0].leverage == 1.0  # the 5 % spike makes realised vol > target: no leverage

    k.set_price("BTC/EUR", 63_100.0)  # bid rises through our ask -> maker fill
    trader.entries_enabled = False
    await trader.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)
    assert len(pos) == 1 and pos[0].side == "short"
    assert any(o.order_type == OrderType.STOP_LOSS and o.side == Side.BUY for o in k.paper.open_orders())

    k.set_price("BTC/EUR", 60_100.0)  # back toward the VWAP target
    await trader.cycle()  # cover order posted at the bid
    k.set_price("BTC/EUR", 59_900.0)
    await trader.cycle()
    closed = bot.db.closed_positions(Broker.KRAKEN, Mode.TEST)
    assert len(closed) == 1 and closed[0].side == "short" and closed[0].pnl > 0
    assert closed[0].exit_reason == "take_profit"
    await bot.shutdown()


async def test_full_consensus_uses_automatic_leverage(make_bot, monkeypatch):
    from tradebot.agents.base import Direction, Vote

    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = setup_dip(bot)
    trader = bot.traders[Broker.KRAKEN]

    async def two_longs(snap, cfgs):
        return [Vote("arbitrage", Direction.LONG, 0.8, "x", 61_000.0), Vote("convergence", Direction.LONG, 0.8, "y",
                                                                           61_000.0),
                Vote.none("smart_money", "")]

    monkeypatch.setattr(trader.agents, "votes", two_longs)
    bot.cfg.strategy.kraken.leverage.target_daily_vol_pct = 50.0  # the fixture dip counts as "calm" vs 50 %/day
    trader.entries_enabled = True
    await trader.cycle()
    entry = [r for r in k.placed if r.purpose.value == "entry"][0]
    # realised vol well below target -> leverage hits the 2x cap; notional = 5 % x 2 of equity
    assert entry.leverage == 2.0
    assert entry.qty * entry.limit_price == pytest.approx(1000 * 0.05 * 2, rel=0.01)
    await bot.shutdown()


async def test_small_target_is_skipped_by_reward_risk_filter(make_bot):
    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = bot.adapters[Broker.KRAKEN]
    closes = [60_000.0 + (i % 3 - 1) * 50 for i in range(60)] + [58_800.0]  # -2 %: gain mostly eaten by fees
    k.bars["BTC/EUR"] = make_bars(closes, [10.0] * 60 + [40.0])
    k.set_price("BTC/EUR", 58_800.0)
    trader = bot.traders[Broker.KRAKEN]
    trader.entries_enabled = True
    await trader.cycle()
    assert not [r for r in k.placed if r.purpose.value == "entry"]
    d, _ = bot.db.last_decisions(1)[0]
    assert d.risk_result.startswith("skipped: reward/risk")
    await bot.shutdown()


async def test_trailing_stop_moves_to_break_even_at_broker(make_bot):
    bot = make_bot()
    bot.cfg.strategy.kraken.scanner.min_depth_eur = 0
    k = setup_dip(bot)
    trader = bot.traders[Broker.KRAKEN]
    trader.entries_enabled = True
    await trader.cycle()
    k.set_price("BTC/EUR", 56_900.0)
    trader.entries_enabled = False
    await trader.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)[0]
    risk = pos.entry_price - pos.initial_stop_price
    k.set_price("BTC/EUR", pos.entry_price + 1.2 * risk)  # +1.2 R, still below the take-profit
    await trader.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)[0]
    assert pos.stop_price > pos.entry_price  # break-even plus fees
    stops = [o for o in k.paper.open_orders() if o.order_type == OrderType.STOP_LOSS]
    assert len(stops) == 1 and stops[0].stop_price == pytest.approx(pos.stop_price)
    await bot.shutdown()
