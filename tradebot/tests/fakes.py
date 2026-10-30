"""Test doubles: an in-memory broker built on the paper engine, and a fake ib_async IB."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from tradebot.brokers.base import (
    Bar,
    Broker,
    BrokerAdapter,
    Fees,
    InstrumentRules,
    Mode,
    OrderBook,
    OrderRejected,
    OrderRequest,
    OrderStatus,
    Quote,
)
from tradebot.brokers.paper_engine import PaperEngine, pct_fee_fn
from tradebot.engine.risk import ensure_approved

T0 = datetime(2026, 10, 1, tzinfo=timezone.utc)


def make_bars(closes: list[float], volumes: list[float] | None = None, start: datetime = T0,
              step: timedelta = timedelta(minutes=15)) -> list[Bar]:
    vols = volumes or [100.0] * len(closes)
    out = []
    for i, (c, v) in enumerate(zip(closes, vols)):
        out.append(Bar(start + step * i, c, c * 1.001, c * 0.999, c, v))
    return out


class FakeAdapter(BrokerAdapter):
    """Broker backed by a PaperEngine; prices are set by the test."""

    def __init__(self, broker: Broker, mode_switch, cash: float = 1000.0, symbols=("BTC/EUR",)):
        self.broker = broker
        self.mode_switch = mode_switch
        self.fees = Fees(0.0025, 0.004)
        self.paper = PaperEngine(str(broker), cash, pct_fee_fn(self.fees), slippage_bps=0)
        self.symbols = list(symbols)
        self.quotes: dict[str, Quote] = {}
        self.bars: dict[str, list[Bar]] = {}
        self.market_open = True
        self.placed: list[OrderRequest] = []
        self._connected = False

    @property
    def mode(self) -> Mode:
        return self.mode_switch.mode(self.broker)

    @property
    def connected(self) -> bool:
        return self._connected

    async def connect(self) -> None:
        self._connected = True

    def set_price(self, symbol: str, price: float, spread: float = 0.0002) -> None:
        q = Quote(symbol, price * (1 - spread / 2), price * (1 + spread / 2), price, 1e6)
        self.quotes[symbol] = q
        depth = 1e9
        self.paper.update_book(OrderBook(symbol, ((q.bid, depth / q.bid),), ((q.ask, depth / q.ask),)))

    async def get_balances(self):
        return self.paper.balances()

    async def get_positions(self):
        return self.paper.get_positions()

    async def get_quote(self, symbol):
        return self.quotes[symbol]

    async def get_quotes(self, symbols):
        return {s: self.quotes[s] for s in symbols if s in self.quotes}

    async def get_orderbook(self, symbol, depth=10):
        q = self.quotes[symbol]
        return OrderBook(symbol, ((q.bid, 1e9 / q.bid),), ((q.ask, 1e9 / q.ask),))

    async def place_order(self, req: OrderRequest):
        ensure_approved(req, self.mode)
        self.placed.append(req)
        o = self.paper.place(req, await self.get_rules(req.symbol))
        if o.status == OrderStatus.REJECTED:
            raise OrderRejected(o.reason)
        return o

    async def cancel_order(self, order_id):
        return self.paper.cancel(order_id)

    async def get_open_orders(self):
        return self.paper.open_orders()

    async def get_fees(self, symbol):
        return self.fees

    async def is_market_open(self, symbol, now=None):
        return self.market_open

    async def stream(self, symbols, callback):
        return None

    async def get_rules(self, symbol):
        return InstrumentRules(symbol, "EUR", min_qty=0.0001, qty_step=1e-8, tick_size=0.01)

    async def get_bars(self, symbol, limit=200):
        return self.bars.get(symbol, [])[-limit:]

    async def list_symbols(self):
        return self.symbols

    def has_pair(self, symbol):
        return symbol in self.symbols

    async def get_equity(self):
        return self.paper.equity(), self.paper.cash - self.paper.reserved_cash()

    async def poll_fills(self):
        return self.paper.take_fills()

    async def sessions(self, symbol, now=None):
        now = now or datetime.now(timezone.utc)
        return [(now - timedelta(hours=1), now + timedelta(hours=5))]

    async def current_session(self, symbol, now=None):
        return (await self.sessions(symbol, now))[0]

    async def avg_daily_volume(self, symbol, days=20):
        return 1e7


class FakeTrade:
    def __init__(self, contract, order):
        self.contract = contract
        self.order = order
        self.orderStatus = SimpleNamespace(status="Submitted", filled=0, avgFillPrice=0)
        self.log = []


class FakeIB:
    """Minimal stand-in for ib_async.IB used by the IBKR adapter tests."""

    def __init__(self, accounts=("DU123456",), liquid_hours: str = ""):
        self.accounts = list(accounts)
        self.connected_to: tuple | None = None
        self.market_data_type = None
        self._trades: list[FakeTrade] = []
        self._next_id = 100
        self.liquid_hours = liquid_hours
        self.client = SimpleNamespace(getReqId=self._req_id)

    def _req_id(self):
        self._next_id += 1
        return self._next_id

    async def connectAsync(self, host, port, clientId, timeout):
        self.connected_to = (host, port, clientId)

    def isConnected(self):
        return self.connected_to is not None

    def disconnect(self):
        self.connected_to = None

    def managedAccounts(self):
        return self.accounts

    def reqMarketDataType(self, t):
        self.market_data_type = t

    async def qualifyContractsAsync(self, c):
        return [c]

    async def reqContractDetailsAsync(self, c):
        return [SimpleNamespace(minTick=0.01, minSize=1, sizeIncrement=1, liquidHours=self.liquid_hours,
                                timeZoneId="US/Eastern")]

    def bracketOrder(self, action, quantity, limitPrice, takeProfitPrice, stopLossPrice):
        from ib_async import LimitOrder, StopOrder

        parent = LimitOrder(action, quantity, limitPrice, orderId=self._req_id(), transmit=False)
        reverse = "BUY" if action == "SELL" else "SELL"  # same as ib_async.IB.bracketOrder
        tp = LimitOrder(reverse, quantity, takeProfitPrice, orderId=self._req_id(), parentId=parent.orderId,
                        transmit=False)
        sl = StopOrder(reverse, quantity, stopLossPrice, orderId=self._req_id(), parentId=parent.orderId,
                       transmit=True)
        return SimpleNamespace(parent=parent, takeProfit=tp, stopLoss=sl)

    def placeOrder(self, contract, order):
        t = FakeTrade(contract, order)
        self._trades.append(t)
        return t

    def trades(self):
        return self._trades

    def openTrades(self):
        return [t for t in self._trades if t.orderStatus.status not in ("Cancelled", "Filled")]

    def cancelOrder(self, order):
        for t in self._trades:
            if t.order is order:
                t.orderStatus.status = "Cancelled"
