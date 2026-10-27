from __future__ import annotations

from datetime import datetime, timezone

import pytest

from tradebot.brokers.base import Broker, MarketClosed, Mode, ModeViolation, OrderRequest, OrderType, Side
from tradebot.brokers.ibkr import IBKRAdapter, IBKRFeeSchedule, parse_liquid_hours, session_at
from tradebot.engine.mode import ModeSwitch, Precondition, confirm_phrase
from tradebot.engine.risk import AccountState, RiskManager
from tradebot.settings import IBKRCfg, IBKRFeesCfg, RiskConfig, Secrets, UniverseEntry, UniverseIBKR
from tradebot.tests.fakes import FakeIB

UNIVERSE = UniverseIBKR(instruments=[UniverseEntry(symbol="AAPL", currency="USD", primary_exchange="NASDAQ")])


def today_hours(open_=True) -> str:
    d = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"{d}:0000-{d}:2359" if open_ else f"{d}:CLOSED"


def make(ib: FakeIB, mode=None, secrets=None):
    mode = mode or ModeSwitch()
    return IBKRAdapter(IBKRCfg(), UNIVERSE, mode, secrets or Secrets(), ib_factory=lambda: ib), mode


async def test_refuses_live_port_in_test_mode():
    ib = FakeIB()
    a, _ = make(ib)
    with pytest.raises(ModeViolation):
        await a.connect(port=a.cfg.gateway.live_port)
    assert ib.connected_to is None


async def test_connects_to_paper_port_with_delayed_data():
    ib = FakeIB()
    a, _ = make(ib)
    await a.connect()
    assert ib.connected_to == ("127.0.0.1", 4002, 17)
    assert ib.market_data_type == 3


async def test_refuses_non_paper_account_in_test_mode():
    a, _ = make(FakeIB(accounts=("U999",)))
    with pytest.raises(ModeViolation):
        await a.connect()


async def test_refuses_remote_gateway():
    a, _ = make(FakeIB())
    a.cfg.gateway.host = "10.0.0.5"
    with pytest.raises(ModeViolation):
        await a.connect()


async def test_mode_change_disconnects_and_live_uses_live_port():
    ib = FakeIB(accounts=("U777",))
    a, mode = make(ib, secrets=Secrets(ibkr_live_account="U777"))
    mode.request_live(Broker.IBKR, confirm_phrase("ibkr"), [Precondition("ok", True)])
    await a.connect()
    assert ib.connected_to[1] == 4001
    mode.set_test(Broker.IBKR)
    assert not a.connected


def _approved(a: IBKRAdapter):
    rm = RiskManager(RiskConfig())
    req = OrderRequest("AAPL", Side.BUY, 1, OrderType.LIMIT, limit_price=200.0, reference_price=200.0,
                       take_profit=210.0)
    return rm.approve(Broker.IBKR, req, AccountState(Broker.IBKR, Mode.TEST, 10_000, 10_000), None).request


async def test_bracket_order_carries_stop_loss_child():
    ib = FakeIB(liquid_hours=today_hours(True))
    a, _ = make(ib)
    req = _approved(a)
    order = await a.place_order(req)
    kinds = [(t.order.orderType, t.order.action, t.order.orderRef) for t in ib.trades()]
    assert ("LMT", "BUY", order.client_id) in kinds
    assert any(k[0] == "STP" and k[1] == "SELL" for k in kinds)
    assert any(k[0] == "LMT" and k[1] == "SELL" for k in kinds)
    # resubmitting the same order is deduplicated, never sent twice
    n = len(ib.trades())
    again = await a.place_order(req)
    assert again.id == order.id and len(ib.trades()) == n


async def test_refuses_orders_outside_session():
    a, _ = make(FakeIB(liquid_hours=today_hours(False)))
    with pytest.raises(MarketClosed):
        await a.place_order(_approved(a))


def test_liquid_hours_parsing_handles_holidays():
    spec = "20261027:0930-20261027:1600;20261028:CLOSED;20261029:0930-20261029:1600"
    sess = parse_liquid_hours(spec, "US/Eastern")
    assert len(sess) == 2
    assert sess[0][0] == datetime(2026, 10, 27, 13, 30, tzinfo=timezone.utc)
    assert session_at(sess, datetime(2026, 10, 28, 15, 0, tzinfo=timezone.utc)) is None
    assert session_at(sess, datetime(2026, 10, 29, 15, 0, tzinfo=timezone.utc)) is not None


def test_fee_schedule():
    fees = IBKRFeeSchedule(IBKRFeesCfg(), lambda s: "USD" if s == "AAPL" else "EUR")
    assert fees("AAPL", Side.BUY, 10, 200, False) == pytest.approx(1.0)  # min per order
    assert fees("MC", Side.BUY, 10, 600, False) == pytest.approx(3.0)  # EU min
    assert fees("MC", Side.BUY, 100, 600, False) == pytest.approx(30.0)  # 0.05 %
