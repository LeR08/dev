"""RiskManager: every order needs its approval; oversize orders are resized or refused."""

from __future__ import annotations

from datetime import timedelta

import pytest

from tradebot.brokers.base import (
    Broker,
    InstrumentRules,
    Mode,
    OrderRequest,
    OrderType,
    Purpose,
    Side,
    UnapprovedOrder,
    utcnow,
)
from tradebot.engine.risk import AccountState, PositionInfo, RiskManager, ensure_approved
from tradebot.settings import RiskConfig

def pct_cfg() -> RiskConfig:
    """Percent-of-capital sizing (v1 rules): 5 % / 2.5 %, 3 % stop, no per-trade risk budget."""
    cfg = RiskConfig()
    for b in (cfg.kraken, cfg.ibkr):
        b.max_position_pct_full, b.max_position_pct_half, b.stop_loss_pct = 5.0, 2.5, 3.0
        b.risk_per_trade_pct = None
    return cfg


RULES = InstrumentRules("BTC/EUR", "EUR", min_qty=0.0001, qty_step=1e-8, tick_size=0.1)


def acct(**kw) -> AccountState:
    base = dict(broker=Broker.KRAKEN, mode=Mode.TEST, equity=1000.0, cash=1000.0)
    base.update(kw)
    return AccountState(**base)


def entry(qty=1.0, price=50_000.0, **kw) -> OrderRequest:
    return OrderRequest("BTC/EUR", Side.BUY, qty, OrderType.LIMIT, limit_price=price, post_only=True,
                        reference_price=price, **kw)


def test_order_above_limit_is_resized_down():
    rm = RiskManager(pct_cfg())
    d = rm.approve(Broker.KRAKEN, entry(qty=1.0), acct(), RULES, size_factor=1.0)
    assert d.approved and d.resized
    assert d.request.qty * 50_000 == pytest.approx(50.0, rel=1e-6)  # 5 % of 1000 EUR
    half = rm.approve(Broker.KRAKEN, entry(qty=1.0), acct(), RULES, size_factor=0.5)
    assert half.request.qty * 50_000 == pytest.approx(25.0, rel=1e-6)  # 2.5 %


def test_stop_loss_is_always_attached():
    rm = RiskManager(pct_cfg())
    d = rm.approve(Broker.KRAKEN, entry(qty=0.0001), acct(), RULES)
    assert d.request.stop_loss == pytest.approx(48_500.0, abs=0.1)  # 3 % below entry


def test_refusals():
    rm = RiskManager(pct_cfg())
    full = {f"S{i}": PositionInfo(1, 10) for i in range(5)}
    assert not rm.approve(Broker.KRAKEN, entry(), acct(positions=full), RULES).approved  # max positions
    big = {"ETH/EUR": PositionInfo(1, 600)}
    assert not rm.approve(Broker.KRAKEN, entry(), acct(positions=big), RULES).approved  # gross exposure 60 %
    assert not rm.approve(Broker.KRAKEN, entry(), acct(mode=Mode.LIVE), RULES).approved  # live cap missing
    mkt = OrderRequest("BTC/EUR", Side.BUY, 0.001, OrderType.MARKET, reference_price=50_000)
    assert not rm.approve(Broker.KRAKEN, mkt, acct(), RULES).approved  # market buys
    naked = OrderRequest("BTC/EUR", Side.SELL, 1, OrderType.LIMIT, limit_price=50_000, purpose=Purpose.EXIT)
    assert not rm.approve(Broker.KRAKEN, naked, acct(), RULES).approved  # exits only close positions
    tiny = rm.approve(Broker.KRAKEN, entry(), acct(equity=10, cash=10), RULES)
    assert not tiny.approved and "minimum" in tiny.reason


def test_sell_clamped_to_position():
    rm = RiskManager(pct_cfg())
    req = OrderRequest("BTC/EUR", Side.SELL, 5, OrderType.LIMIT, limit_price=50_000, purpose=Purpose.EXIT)
    d = rm.approve(Broker.KRAKEN, req, acct(positions={"BTC/EUR": PositionInfo(0.002, 100)}), RULES)
    assert d.approved and d.request.qty == 0.002


def test_live_capital_cap_limits_size():
    cfg = pct_cfg()
    cfg.kraken.live_capital_cap_eur = 200
    rm = RiskManager(cfg)
    d = rm.approve(Broker.KRAKEN, entry(qty=1), acct(mode=Mode.LIVE, equity=10_000, cash=10_000), RULES)
    assert d.approved and d.request.qty * 50_000 == pytest.approx(10.0, rel=1e-6)  # 5 % of 200


def test_throttle_max_orders_per_minute():
    rm = RiskManager(pct_cfg())
    oks = [rm.approve(Broker.KRAKEN, entry(qty=0.0002), acct(), RULES).approved for _ in range(12)]
    assert oks[:10] == [True] * 10 and oks[10:] == [False, False]
    # emergency exits are never throttled
    req = OrderRequest("BTC/EUR", Side.SELL, 0.001, OrderType.MARKET, purpose=Purpose.EMERGENCY)
    assert rm.approve(Broker.KRAKEN, req, acct(positions={"BTC/EUR": PositionInfo(0.001, 50)}), RULES,
                      emergency=True).approved


def test_daily_loss_and_drawdown_events():
    rm = RiskManager(pct_cfg())
    ev = rm.evaluate_account(Broker.KRAKEN, acct(equity=960, day_start_equity=1000, peak_equity=1000))
    assert [e.kind.value for e in ev] == ["daily_loss_limit"]
    ev = rm.evaluate_account(Broker.KRAKEN, acct(equity=840, day_start_equity=850, peak_equity=1000))
    assert [e.kind.value for e in ev] == ["drawdown_limit"]


def test_halt_blocks_entries_until_next_day():
    now = [utcnow()]
    rm = RiskManager(RiskConfig(), clock=lambda: now[0])
    rm.halt(Broker.KRAKEN, "daily loss", now[0].date() + timedelta(days=1))
    assert not rm.approve(Broker.KRAKEN, entry(qty=0.0002), acct(), RULES).approved
    now[0] += timedelta(days=1)
    assert rm.approve(Broker.KRAKEN, entry(qty=0.0002), acct(), RULES).approved


def test_approval_cannot_be_forged_or_modified():
    rm = RiskManager(pct_cfg())
    req = rm.approve(Broker.KRAKEN, entry(qty=0.0002), acct(), RULES).request
    ensure_approved(req, Mode.TEST)
    with pytest.raises(UnapprovedOrder):
        ensure_approved(req, Mode.LIVE)  # approved in test, cannot be sent live
    req.qty = 1.0
    with pytest.raises(UnapprovedOrder):
        ensure_approved(req, Mode.TEST)
    with pytest.raises(UnapprovedOrder):
        ensure_approved(entry(qty=0.0002), Mode.TEST)


def test_risk_set_validates_and_logs():
    events = []
    rm = RiskManager(RiskConfig(), on_event=events.append)
    rm.set_limit("kraken.max_open_positions", "3")
    assert rm.cfg(Broker.KRAKEN).max_open_positions == 3
    rm.set_limit("live_capital_cap_eur", "250")
    assert rm.cfg(Broker.IBKR).live_capital_cap_eur == 250
    with pytest.raises(Exception):
        rm.set_limit("kraken.stop_loss_pct", "-1")
    with pytest.raises(KeyError):
        rm.set_limit("kraken.leverage", "2")
    assert any(e.kind.value == "limit_changed" for e in events)


def short_entry(qty=1.0, price=50_000.0, **kw) -> OrderRequest:
    return OrderRequest("BTC/EUR", Side.SELL, qty, OrderType.LIMIT, limit_price=price, post_only=True,
                        reference_price=price, **kw)


def test_short_entry_gets_stop_above_and_is_sized():
    rm = RiskManager(pct_cfg())
    d = rm.approve(Broker.KRAKEN, short_entry(), acct(), RULES)
    assert d.approved and d.request.stop_loss == pytest.approx(51_500.0, abs=0.1)  # 3 % above
    assert d.request.qty * 50_000 == pytest.approx(50.0, rel=1e-6)
    bad_tp = rm.approve(Broker.KRAKEN, short_entry(take_profit=52_000), acct(), RULES)
    assert not bad_tp.approved


def test_short_refused_when_disabled_or_not_shortable():
    cfg = pct_cfg()
    cfg.kraken.allow_short = False
    assert not RiskManager(cfg).approve(Broker.KRAKEN, short_entry(), acct(), RULES).approved
    no_margin = InstrumentRules("BTC/EUR", "EUR", min_qty=0.0001, qty_step=1e-8, shortable=False)
    assert not RiskManager(pct_cfg()).approve(Broker.KRAKEN, short_entry(), acct(), no_margin).approved


def test_leverage_is_capped_and_multiplies_size():
    rm = RiskManager(pct_cfg())  # max_leverage 2
    d = rm.approve(Broker.KRAKEN, entry(qty=1, leverage=5.0), acct(), RULES)
    assert d.approved and d.request.leverage == 2.0 and d.resized
    assert d.request.qty * 50_000 == pytest.approx(100.0, rel=1e-6)  # 5 % x 2
    cfg = pct_cfg()
    cfg.kraken.max_leverage = 10
    rm10 = RiskManager(cfg)
    low = InstrumentRules("BTC/EUR", "EUR", min_qty=0.0001, qty_step=1e-8, max_leverage=3)
    assert rm10.approve(Broker.KRAKEN, entry(qty=1, leverage=5.0), acct(), low).request.leverage == 3.0
    # leverage is always a whole number (Kraken margin: 2x..10x)
    assert rm10.approve(Broker.KRAKEN, entry(qty=1, leverage=4.7), acct(), RULES).request.leverage == 4.0
    assert rm10.approve(Broker.KRAKEN, entry(qty=1, leverage=1.9), acct(), RULES).request.leverage == 1.0


def test_leverage_limited_by_free_margin():
    cfg = pct_cfg()
    cfg.kraken.max_exposure_pct = 500  # isolate the margin check
    rm = RiskManager(cfg)
    # 1000 equity, 980 EUR already tied up as collateral -> only 20 EUR of free margin
    used = {"ETH/EUR": PositionInfo(1, 980, 1.0)}
    d = rm.approve(Broker.KRAKEN, entry(qty=1, leverage=2.0), acct(cash=20, positions=used), RULES)
    assert d.approved and d.request.qty * 50_000 == pytest.approx(20 * 0.95 * 2, rel=1e-6)


def test_exit_must_reduce_and_keeps_position_leverage():
    rm = RiskManager(pct_cfg())
    shorted = {"BTC/EUR": PositionInfo(-0.002, 100, 2.0)}
    cover = OrderRequest("BTC/EUR", Side.BUY, 1, OrderType.LIMIT, limit_price=49_000, purpose=Purpose.EXIT)
    d = rm.approve(Broker.KRAKEN, cover, acct(positions=shorted), RULES)
    assert d.approved and d.request.qty == 0.002 and d.request.leverage == 2.0
    wrong = OrderRequest("BTC/EUR", Side.SELL, 0.001, OrderType.LIMIT, limit_price=49_000, purpose=Purpose.EXIT)
    assert not rm.approve(Broker.KRAKEN, wrong, acct(positions=shorted), RULES).approved


def test_approval_covers_leverage():
    rm = RiskManager(pct_cfg())
    req = rm.approve(Broker.KRAKEN, entry(qty=0.0002, leverage=2.0), acct(), RULES).request
    req.leverage = 5.0
    with pytest.raises(UnapprovedOrder):
        ensure_approved(req, Mode.TEST)


def test_fixed_fractional_risk_sizing():
    rm = RiskManager(RiskConfig())  # defaults: 0.5 % risk per trade, 10 % notional cap, 8 % max stop
    # stop 2 % below: risk 5 EUR -> 250 EUR notional, but capped at 10 % = 100 EUR
    d = rm.approve(Broker.KRAKEN, entry(qty=1, stop_loss=49_000.0), acct(), RULES)
    assert d.request.qty * 50_000 == pytest.approx(100.0, rel=1e-6)
    # stop 8 % below: risk 5 EUR -> 62.5 EUR notional; a stop-out loses exactly 0.5 % of capital
    d = rm.approve(Broker.KRAKEN, entry(qty=1, stop_loss=46_000.0), acct(), RULES)
    assert d.request.qty * (50_000 - 46_000) == pytest.approx(5.0, rel=1e-6)
    half = rm.approve(Broker.KRAKEN, entry(qty=1, stop_loss=46_000.0), acct(), RULES, size_factor=0.5)
    assert half.request.qty * (50_000 - 46_000) == pytest.approx(2.5, rel=1e-6)
