from __future__ import annotations

import pytest

from tradebot.brokers.base import Bar, Fees, OrderBook, OrderRequest, OrderStatus, OrderType, Purpose, Quote, Side
from tradebot.brokers.paper_engine import PaperEngine, pct_fee_fn
from tradebot.tests.fakes import T0


def engine(cash=1000.0):
    pe = PaperEngine("kraken", cash, pct_fee_fn(Fees(0.0025, 0.004)), slippage_bps=0)
    pe.update_book(OrderBook("BTC/EUR", ((100.0, 10.0), (99.0, 10.0)), ((101.0, 10.0), (102.0, 10.0))))
    return pe


def test_post_only_crossing_is_rejected():
    pe = engine()
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 1, OrderType.LIMIT, limit_price=101.0, post_only=True))
    assert o.status == OrderStatus.REJECTED and "post-only" in o.reason


def test_resting_limit_fills_as_maker_with_fee_and_stop_child():
    pe = engine()
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 1, OrderType.LIMIT, limit_price=100.0, post_only=True,
                              stop_loss=97.0))
    assert o.status == OrderStatus.OPEN
    pe.update_book(OrderBook("BTC/EUR", ((99.0, 5.0),), ((100.0, 5.0),)))
    assert o.status == OrderStatus.FILLED
    assert pe.cash == pytest.approx(1000 - 100 - 0.25)
    stops = [x for x in pe.open_orders() if x.order_type == OrderType.STOP_LOSS]
    assert len(stops) == 1 and stops[0].stop_price == 97.0
    pe.update_book(OrderBook("BTC/EUR", ((96.5, 5.0),), ((97.0, 5.0),)))
    assert stops[0].status == OrderStatus.FILLED and "BTC/EUR" not in pe.positions
    assert pe.realized_pnl < 0


def test_market_order_walks_the_book():
    pe = engine()
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 15, OrderType.MARKET, purpose=Purpose.EMERGENCY))
    # cost check uses ask -> 15*101 > 1000 cash
    assert o.status == OrderStatus.REJECTED
    pe = engine(cash=10_000)
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 15, OrderType.MARKET))
    assert o.status == OrderStatus.FILLED
    assert o.avg_fill_price == pytest.approx((10 * 101 + 5 * 102) / 15)


def test_reduce_only_and_no_overspend():
    pe = engine()
    o = pe.place(OrderRequest("BTC/EUR", Side.SELL, 1, OrderType.LIMIT, limit_price=105, purpose=Purpose.EXIT))
    assert o.status == OrderStatus.REJECTED and "reduce-only" in o.reason
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 50, OrderType.LIMIT, limit_price=100))
    assert o.status == OrderStatus.REJECTED and "cash" in o.reason
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 15, OrderType.LIMIT, limit_price=100, leverage=2.0))
    assert o.status == OrderStatus.REJECTED and "margin" in o.reason  # 1500 notional / 2 > 1000


def test_short_position_pnl_stop_and_financing():
    from datetime import timedelta

    from tradebot.settings import FinancingCfg

    now = [T0]
    pe = PaperEngine("kraken", 1000, pct_fee_fn(Fees(0.0, 0.0)), slippage_bps=0, clock=lambda: now[0],
                     financing=FinancingCfg(open_fee_bps=2, rollover_bps_per_4h=2))
    pe.update_book(OrderBook("BTC/EUR", ((100.0, 50.0),), ((100.2, 50.0),)))
    o = pe.place(OrderRequest("BTC/EUR", Side.SELL, 5, OrderType.LIMIT, limit_price=100.2, post_only=True,
                              stop_loss=103.0, leverage=2.0))
    assert o.status == OrderStatus.OPEN
    pe.update_book(OrderBook("BTC/EUR", ((100.3, 50.0),), ((100.5, 50.0),)))  # bid rises to our ask -> fill
    assert pe.positions["BTC/EUR"].qty == -5 and pe.positions["BTC/EUR"].leverage == 2.0
    stops = [x for x in pe.open_orders() if x.order_type == OrderType.STOP_LOSS]
    assert stops and stops[0].side == Side.BUY and stops[0].stop_price == 103.0
    now[0] += timedelta(hours=8)
    pe.update_book(OrderBook("BTC/EUR", ((95.0, 50.0),), ((95.2, 50.0),)))  # price falls: short gains
    assert pe.equity() > 1000 and pe.financing_paid > 0
    now[0] += timedelta(hours=1)
    pe.update_book(OrderBook("BTC/EUR", ((103.0, 50.0),), ((103.2, 50.0),)))  # stop triggers on ask
    assert "BTC/EUR" not in pe.positions and pe.realized_pnl < 0


def test_liquidation_when_equity_below_maintenance():
    from tradebot.settings import FinancingCfg

    pe = PaperEngine("kraken", 1000, pct_fee_fn(Fees(0.0, 0.0)), slippage_bps=0,
                     financing=FinancingCfg(maintenance_margin_pct=50))
    pe.update_book(OrderBook("BTC/EUR", ((100.0, 100.0),), ((100.0, 100.0),)))
    pe.place(OrderRequest("BTC/EUR", Side.BUY, 19, OrderType.MARKET, leverage=2.0))  # 1900 notional, 950 margin
    pe.update_book(OrderBook("BTC/EUR", ((70.0, 100.0),), ((70.0, 100.0),)))  # equity 1000-570=430 < 475*0.5? no
    pe.update_book(OrderBook("BTC/EUR", ((60.0, 100.0),), ((60.0, 100.0),)))  # equity 240 < 570*0.5 -> liquidate
    assert "BTC/EUR" in pe.liquidations and not pe.positions


def test_oco_take_profit_cancels_stop_on_bar():
    pe = engine()
    pe.place(OrderRequest("BTC/EUR", Side.BUY, 1, OrderType.LIMIT, limit_price=100.0, stop_loss=95.0,
                          take_profit=110.0))
    fills = pe.on_bar("BTC/EUR", Bar(T0, 100.5, 101, 99.5, 100.8, 10), spread_bps=0)
    assert any(f.side == Side.BUY for f in fills)
    fills = pe.on_bar("BTC/EUR", Bar(T0, 105, 111, 104, 109, 10), spread_bps=0)
    assert [f.purpose for f in fills] == [Purpose.TAKE_PROFIT]
    assert not pe.open_orders()  # stop cancelled by OCO


def test_equity_marks_to_market():
    pe = engine()
    pe.place(OrderRequest("BTC/EUR", Side.BUY, 1, OrderType.MARKET))
    pe.update_quote(Quote("BTC/EUR", 120, 121, 120.5))
    assert pe.equity() == pytest.approx(pe.cash + 120.5)
