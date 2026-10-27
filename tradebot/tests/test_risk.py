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

RULES = InstrumentRules("BTC/EUR", "EUR", min_qty=0.0001, qty_step=1e-8, tick_size=0.1)


def acct(**kw) -> AccountState:
    base = dict(broker=Broker.KRAKEN, mode=Mode.TEST, equity=1000.0, cash=1000.0)
    base.update(kw)
    return AccountState(**base)


def entry(qty=1.0, price=50_000.0, **kw) -> OrderRequest:
    return OrderRequest("BTC/EUR", Side.BUY, qty, OrderType.LIMIT, limit_price=price, post_only=True,
                        reference_price=price, **kw)


def test_order_above_limit_is_resized_down():
    rm = RiskManager(RiskConfig())
    d = rm.approve(Broker.KRAKEN, entry(qty=1.0), acct(), RULES, size_factor=1.0)
    assert d.approved and d.resized
    assert d.request.qty * 50_000 == pytest.approx(50.0, rel=1e-6)  # 5 % of 1000 EUR
    half = rm.approve(Broker.KRAKEN, entry(qty=1.0), acct(), RULES, size_factor=0.5)
    assert half.request.qty * 50_000 == pytest.approx(25.0, rel=1e-6)  # 2.5 %


def test_stop_loss_is_always_attached():
    rm = RiskManager(RiskConfig())
    d = rm.approve(Broker.KRAKEN, entry(qty=0.0001), acct(), RULES)
    assert d.request.stop_loss == pytest.approx(48_500.0, abs=0.1)  # 3 % below entry


def test_refusals():
    rm = RiskManager(RiskConfig())
    full = {f"S{i}": PositionInfo(1, 10) for i in range(5)}
    assert not rm.approve(Broker.KRAKEN, entry(), acct(positions=full), RULES).approved  # max positions
    big = {"ETH/EUR": PositionInfo(1, 300)}
    assert not rm.approve(Broker.KRAKEN, entry(), acct(positions=big), RULES).approved  # exposure 30 %
    assert not rm.approve(Broker.KRAKEN, entry(), acct(mode=Mode.LIVE), RULES).approved  # live cap missing
    mkt = OrderRequest("BTC/EUR", Side.BUY, 0.001, OrderType.MARKET, reference_price=50_000)
    assert not rm.approve(Broker.KRAKEN, mkt, acct(), RULES).approved  # market buys
    short = OrderRequest("BTC/EUR", Side.SELL, 1, OrderType.LIMIT, limit_price=50_000, purpose=Purpose.EXIT)
    assert not rm.approve(Broker.KRAKEN, short, acct(), RULES).approved  # no short selling
    tiny = rm.approve(Broker.KRAKEN, entry(), acct(equity=10, cash=10), RULES)
    assert not tiny.approved and "minimum" in tiny.reason


def test_sell_clamped_to_position():
    rm = RiskManager(RiskConfig())
    req = OrderRequest("BTC/EUR", Side.SELL, 5, OrderType.LIMIT, limit_price=50_000, purpose=Purpose.EXIT)
    d = rm.approve(Broker.KRAKEN, req, acct(positions={"BTC/EUR": PositionInfo(0.002, 100)}), RULES)
    assert d.approved and d.request.qty == 0.002


def test_live_capital_cap_limits_size():
    cfg = RiskConfig()
    cfg.kraken.live_capital_cap_eur = 200
    rm = RiskManager(cfg)
    d = rm.approve(Broker.KRAKEN, entry(qty=1), acct(mode=Mode.LIVE, equity=10_000, cash=10_000), RULES)
    assert d.approved and d.request.qty * 50_000 == pytest.approx(10.0, rel=1e-6)  # 5 % of 200


def test_throttle_max_orders_per_minute():
    rm = RiskManager(RiskConfig())
    oks = [rm.approve(Broker.KRAKEN, entry(qty=0.0002), acct(), RULES).approved for _ in range(12)]
    assert oks[:10] == [True] * 10 and oks[10:] == [False, False]
    # emergency exits are never throttled
    req = OrderRequest("BTC/EUR", Side.SELL, 0.001, OrderType.MARKET, purpose=Purpose.EMERGENCY)
    assert rm.approve(Broker.KRAKEN, req, acct(positions={"BTC/EUR": PositionInfo(0.001, 50)}), RULES,
                      emergency=True).approved


def test_daily_loss_and_drawdown_events():
    rm = RiskManager(RiskConfig())
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
    rm = RiskManager(RiskConfig())
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
