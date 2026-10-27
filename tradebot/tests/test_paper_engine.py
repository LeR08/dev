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


def test_no_short_and_no_leverage():
    pe = engine()
    o = pe.place(OrderRequest("BTC/EUR", Side.SELL, 1, OrderType.LIMIT, limit_price=105))
    assert o.status == OrderStatus.REJECTED
    o = pe.place(OrderRequest("BTC/EUR", Side.BUY, 50, OrderType.LIMIT, limit_price=100))
    assert o.status == OrderStatus.REJECTED and "leverage" in o.reason


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
