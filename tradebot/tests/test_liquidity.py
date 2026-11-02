"""Liquidity mode: stablecoin signal, one asset at a time, 5 % tranches, re-injection at -33 %, no stop."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from tradebot.brokers.base import Broker, Mode, OrderType
from tradebot.data.defillama import supply_change
from tradebot.engine.liquidity import LiquidityTrader
from tradebot.tests.fakes import make_bars

SUNDAY = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)


class FakeSupply:
    def __init__(self, change):
        self.value = change

    async def change(self, window_days, now=None):
        return (self.value, 300e9)


def test_supply_change_uses_completed_days_only():
    day = timedelta(days=1)
    start = datetime(2026, 9, 1, tzinfo=timezone.utc)
    series = [(start + day * i, 100.0 + i) for i in range(61)]  # last point = 2026-10-31
    change, latest = supply_change(series, 30, datetime(2026, 10, 31, 15, tzinfo=timezone.utc))
    assert latest == 159.0  # 10-30 (the 10-31 value is not complete yet at 15:00 on 10-31)
    assert change == pytest.approx((159.0 / 129.0 - 1) * 100)
    assert supply_change(series[:10], 30, datetime(2026, 9, 20, tzinfo=timezone.utc)) is None


def make_trader(make_bot, change, clock):
    bot = make_bot()
    cfg = bot.cfg
    cfg.strategy.kraken.mode = "liquidity"
    cfg.strategy.kraken.quote_currency = "USD"
    cfg.strategy.kraken.liquidity.assets = ["BTC", "ETH"]
    k = bot.adapters[Broker.KRAKEN]
    k.symbols = ["BTC/USD", "ETH/USD"]
    k.bars["BTC/USD"] = make_bars([50_000.0 + 100 * i for i in range(40)], step=timedelta(days=1))  # +8 %
    k.bars["ETH/USD"] = make_bars([2_000.0 + 20 * i for i in range(40)], step=timedelta(days=1))  # +39 %
    k.set_price("BTC/USD", 54_000.0)
    k.set_price("ETH/USD", 2_800.0)
    now = [clock]
    t = LiquidityTrader(Broker.KRAKEN, k, cfg, bot.risk, bot.mode, bot.db, bot.agents, bot.data,
                        clock=lambda: now[0], supply=FakeSupply(change))
    t.entries_enabled = True
    bot.traders[Broker.KRAKEN] = t
    return bot, t, k, now


async def test_favourable_sunday_buys_the_strongest_one_tranche_no_stop(make_bot):
    bot, t, k, now = make_trader(make_bot, +2.0, SUNDAY)
    await t.cycle()
    entries = [r for r in k.placed if r.purpose.value == "entry"]
    assert len(entries) == 1 and entries[0].symbol == "ETH/USD"  # stronger 30-day return
    assert entries[0].qty * entries[0].limit_price == pytest.approx(1000 * 0.05, rel=0.01)  # 5 % tranche, 1x
    assert entries[0].stop_loss is None and entries[0].no_stop
    k.set_price("ETH/USD", 2_790.0)  # ask falls to our bid -> filled
    await t.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)
    assert [p.symbol for p in pos] == ["ETH/USD"] and pos[0].tranches == 1
    assert not [o for o in k.paper.open_orders() if o.order_type == OrderType.STOP_LOSS]  # no broker stop
    await t.cycle()  # still favourable: never a second asset
    assert [p.symbol for p in bot.db.open_positions(Broker.KRAKEN, Mode.TEST)] == ["ETH/USD"]
    assert "FAVORABLE" in t.status


async def test_daily_decisions_by_default_sunday_optional_and_unfavourable_stays_cash(make_bot):
    _, t, k, _ = make_trader(make_bot, +2.0, SUNDAY - timedelta(days=2))  # Friday
    await t.cycle()
    assert [r.purpose.value for r in k.placed] == ["entry"]  # daily analysis (default)
    _, t1, k1, _ = make_trader(make_bot, +2.0, SUNDAY - timedelta(days=2))
    t1.cfg.strategy.kraken.liquidity.decision_day = "sunday"
    await t1.cycle()
    assert not k1.placed
    _, t2, k2, _ = make_trader(make_bot, -1.0, SUNDAY)
    t2.cfg.strategy.kraken.liquidity.allow_short = False
    await t2.cycle()
    assert not k2.placed and "DÉFAVORABLE" in t2.status and "CASH" in t2.status


async def test_reinjection_every_33_percent_then_exit_when_unfavourable(make_bot):
    bot, t, k, now = make_trader(make_bot, +2.0, SUNDAY)
    await t.cycle()
    k.set_price("ETH/USD", 2_790.0)
    await t.cycle()
    entry = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)[0]
    now[0] = SUNDAY + timedelta(days=2)  # re-injections happen any day
    k.set_price("ETH/USD", entry.entry_price * 0.66)  # -34 %
    await t.cycle()
    adds = [r for r in k.placed if r.purpose.value == "add"]
    assert len(adds) == 1 and adds[0].leverage == 1.0
    k.set_price("ETH/USD", adds[0].limit_price * 0.999)
    await t.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)[0]
    assert pos.tranches == 2 and pos.last_add_price == pytest.approx(adds[0].limit_price)
    await t.cycle()  # no new drop from the last tranche: no third tranche
    assert len([r for r in k.placed if r.purpose.value == "add"]) == 1
    # next Sunday the signal is unfavourable -> exit the whole position
    now[0] = SUNDAY + timedelta(days=7)
    t.cfg.strategy.kraken.liquidity.allow_short = False
    t.supply.value = -0.5
    await t.cycle()
    k.set_price("ETH/USD", pos.last_add_price * 1.01)
    await t.cycle()
    closed = bot.db.closed_positions(Broker.KRAKEN, Mode.TEST)
    assert len(closed) == 1 and closed[0].exit_reason == "liquidity_off"
    assert not bot.db.open_positions(Broker.KRAKEN, Mode.TEST)


async def test_leverage_2x_tranche_and_reinjection_keep_2x(make_bot):
    bot, t, k, now = make_trader(make_bot, +2.0, SUNDAY)
    t.cfg.strategy.kraken.liquidity.leverage = 2
    await t.cycle()
    e = [r for r in k.placed if r.purpose.value == "entry"][0]
    assert e.leverage == 2.0 and e.qty * e.limit_price == pytest.approx(1000 * 0.05 * 2, rel=0.01)
    k.set_price("ETH/USD", 2_790.0)
    await t.cycle()
    entry = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)[0]
    # the drop spreads over two days, so the 3 %/day account loss limit is not hit
    # (a -34 % crash in a single day at 2x would close everything before the re-injection)
    now[0] = SUNDAY + timedelta(days=1)
    k.set_price("ETH/USD", entry.entry_price * 0.82)
    await t.cycle()
    now[0] = SUNDAY + timedelta(days=2)
    k.set_price("ETH/USD", entry.entry_price * 0.66)
    await t.cycle()
    assert [r.leverage for r in k.placed if r.purpose.value == "add"] == [2.0]


def test_risk_refuses_no_stop_unless_allowed():
    from tradebot.brokers.base import OrderRequest, Side
    from tradebot.engine.risk import AccountState, RiskManager
    from tradebot.settings import RiskConfig

    cfg = RiskConfig()
    cfg.kraken.allow_no_stop = False
    req = OrderRequest("BTC/USD", Side.BUY, 0.001, OrderType.LIMIT, limit_price=50_000, reference_price=50_000,
                       no_stop=True)
    acct = AccountState(Broker.KRAKEN, Mode.TEST, 1000, 1000)
    assert not RiskManager(cfg).approve(Broker.KRAKEN, req, acct).approved
    cfg.kraken.allow_no_stop = True
    d = RiskManager(cfg).approve(Broker.KRAKEN, req, acct)
    assert d.approved and d.request.stop_loss is None



async def test_unfavourable_shorts_the_weakest_reinjects_against_and_flips(make_bot):
    bot, t, k, now = make_trader(make_bot, -1.0, SUNDAY)
    await t.cycle()
    e = [r for r in k.placed if r.purpose.value == "entry"]
    assert len(e) == 1 and e[0].symbol == "BTC/USD" and e[0].side.value == "sell"  # weakest 30-day return
    assert e[0].stop_loss is None and "cible SHORT" in t.status
    k.set_price("BTC/USD", 54_100.0)  # bid rises to our ask -> short filled
    await t.cycle()
    pos = bot.db.open_positions(Broker.KRAKEN, Mode.TEST)[0]
    assert pos.side == "short" and pos.symbol == "BTC/USD"
    # +34 % against the short (over two days) -> one more short tranche
    now[0] = SUNDAY + timedelta(days=1)
    k.set_price("BTC/USD", pos.entry_price * 1.2)
    await t.cycle()
    now[0] = SUNDAY + timedelta(days=2)
    k.set_price("BTC/USD", pos.entry_price * 1.34)
    await t.cycle()
    adds = [r for r in k.placed if r.purpose.value == "add"]
    assert len(adds) == 1 and adds[0].side.value == "sell"
    # the signal turns favourable: close the short, then go long the strongest (never two positions)
    now[0] = SUNDAY + timedelta(days=3)
    t.supply.value = +1.5
    k.set_price("BTC/USD", pos.entry_price * 1.33)
    await t.cycle()
    k.set_price("BTC/USD", pos.entry_price * 1.32)
    await t.cycle()
    assert bot.db.closed_positions(Broker.KRAKEN, Mode.TEST)[0].side == "short"
    await t.cycle()
    longs = [r for r in k.placed if r.purpose.value == "entry" and r.side.value == "buy"]
    strongest = max(t.overview, key=lambda v: v.ch_30d).symbol  # BTC after its +32 % squeeze
    assert len(longs) == 1 and longs[0].symbol == strongest
    assert len(bot.db.open_positions(Broker.KRAKEN, Mode.TEST)) <= 1


async def test_overview_has_changes_and_roles(make_bot):
    _, t, k, _ = make_trader(make_bot, +2.0, SUNDAY)
    await t.refresh_overview()
    await t.liquidity_step()
    eth = next(v for v in t.overview if v.symbol == "ETH/USD")
    assert eth.ch_30d is not None and eth.ch_7d is not None and eth.ch_24h is not None
    assert {v.symbol for v in t.overview} == {"BTC/USD", "ETH/USD"}
