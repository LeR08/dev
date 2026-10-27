"""Internal paper-trading engine.

Used for Kraken test mode (fed by live Kraken prices) and as the simulated
broker in backtests (fed bar by bar). Fills against the order book when one is
available, applies simulated fees and slippage, never allows leverage or shorts.
"""

from __future__ import annotations

import itertools
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable

from tradebot.brokers.base import (
    Balance,
    Bar,
    Fees,
    Fill,
    InstrumentRules,
    Order,
    OrderBook,
    OrderRequest,
    OrderStatus,
    OrderType,
    Position,
    Purpose,
    Quote,
    Side,
    utcnow,
)

log = logging.getLogger(__name__)

# fee(symbol, side, qty, price, maker) -> fee in instrument currency
FeeFn = Callable[[str, Side, float, float, bool], float]


def pct_fee_fn(fees: Fees | Callable[[str], Fees]) -> FeeFn:
    def fn(symbol: str, side: Side, qty: float, price: float, maker: bool) -> float:
        f = fees(symbol) if callable(fees) else fees
        return qty * price * (f.maker if maker else f.taker)

    return fn


@dataclass
class _Pos:
    qty: float = 0.0
    avg_price: float = 0.0
    currency: str = "EUR"


@dataclass
class PaperEngine:
    broker: str
    starting_cash: float
    fee_fn: FeeFn
    currency: str = "EUR"
    slippage_bps: float = 5.0
    fx: Callable[[str], float] = lambda ccy: 1.0
    clock: Callable[[], datetime] = utcnow

    cash: float = field(init=False)
    realized_pnl: float = field(init=False, default=0.0)
    fees_paid: float = field(init=False, default=0.0)
    positions: dict[str, _Pos] = field(init=False, default_factory=dict)
    orders: dict[str, Order] = field(init=False, default_factory=dict)
    fills: list[Fill] = field(init=False, default_factory=list)
    _books: dict[str, OrderBook] = field(init=False, default_factory=dict)
    _quotes: dict[str, Quote] = field(init=False, default_factory=dict)
    _ccy: dict[str, str] = field(init=False, default_factory=dict)
    _children: dict[str, tuple[OrderRequest, InstrumentRules]] = field(init=False, default_factory=dict)
    _unread_fills: list[Fill] = field(init=False, default_factory=list)
    _seq: itertools.count = field(init=False, default_factory=lambda: itertools.count(1))

    def __post_init__(self) -> None:
        self.cash = float(self.starting_cash)

    # ------------------------------------------------------------------ market data

    def update_book(self, book: OrderBook) -> list[Fill]:
        self._books[book.symbol] = book
        self._quotes[book.symbol] = book.to_quote(self._quotes.get(book.symbol, book.to_quote()).last)
        return self._match(book.symbol)

    def update_quote(self, quote: Quote) -> list[Fill]:
        self._quotes[quote.symbol] = quote
        self._books.pop(quote.symbol, None)  # a fresher quote supersedes an older book
        return self._match(quote.symbol)

    def last_price(self, symbol: str) -> float | None:
        q = self._quotes.get(symbol)
        return q.mid if q else None

    def _bid_ask(self, symbol: str) -> tuple[float | None, float | None]:
        q = self._quotes.get(symbol)
        if q is None:
            return None, None
        return (q.bid or None), (q.ask or None)

    # ------------------------------------------------------------------ orders

    def _new_id(self) -> str:
        return f"P{self.broker[:2].upper()}-{next(self._seq):06d}"

    def place(self, req: OrderRequest, rules: InstrumentRules | None = None,
              parent_id: str | None = None, oco_group: str | None = None) -> Order:
        rules = rules or InstrumentRules(req.symbol, currency=self.currency)
        self._ccy[req.symbol] = rules.currency
        order = Order(
            id=self._new_id(), client_id=req.client_id, symbol=req.symbol, side=req.side,
            qty=req.qty, order_type=req.order_type, status=OrderStatus.OPEN,
            limit_price=req.limit_price, stop_price=req.stop_price, purpose=req.purpose,
            parent_id=parent_id, oco_group=oco_group, created_at=self.clock(),
        )
        self.orders[order.id] = order
        bid, ask = self._bid_ask(req.symbol)

        if req.side == Side.BUY:
            cost = req.qty * (req.limit_price or ask or 0) * self.fx(rules.currency)
            if cost > self.cash + 1e-9:
                return self._reject(order, "insufficient paper cash (no leverage)")
        else:
            held = self.positions.get(req.symbol, _Pos()).qty
            if req.qty > held + 1e-12:
                return self._reject(order, "insufficient position (no short selling)")

        if req.order_type == OrderType.MARKET:
            if (ask if req.side == Side.BUY else bid) is None:
                return self._reject(order, "no market price")
            self._fill_taker(order)
        elif req.order_type == OrderType.LIMIT:
            if req.limit_price is None:
                return self._reject(order, "limit order without price")
            crosses = (req.side == Side.BUY and ask is not None and req.limit_price >= ask) or (
                req.side == Side.SELL and bid is not None and req.limit_price <= bid)
            if crosses and req.post_only:
                return self._reject(order, "post-only order would take liquidity")
            if crosses:
                self._fill_taker(order, limit=req.limit_price)
        elif req.order_type == OrderType.STOP_LOSS:
            if req.side != Side.SELL or req.stop_price is None:
                return self._reject(order, "stop-loss must be a sell with a stop price")
        if order.status == OrderStatus.FILLED:
            self._after_fill(order, req, rules)
        elif req.take_profit is not None or req.stop_loss is not None:
            self._children[order.id] = (req, rules)
        return order

    def cancel(self, order_id: str) -> bool:
        o = self.orders.get(order_id)
        if o is None or not o.is_open:
            return False
        o.status = OrderStatus.CANCELLED
        self._children.pop(order_id, None)
        return True

    def open_orders(self) -> list[Order]:
        return [o for o in self.orders.values() if o.is_open]

    def _reject(self, order: Order, reason: str) -> Order:
        order.status = OrderStatus.REJECTED
        order.reason = reason
        log.info("paper reject %s %s: %s", order.side, order.symbol, reason, extra={"broker": self.broker})
        return order

    # ------------------------------------------------------------------ matching

    def _walk(self, symbol: str, side: Side, qty: float, limit: float | None) -> float | None:
        """Average price for a taker order walking the book (or quote + slippage)."""
        book = self._books.get(symbol)
        slip = self.slippage_bps / 10_000
        if book is not None:
            levels = book.asks if side == Side.BUY else book.bids
            remaining, cost = qty, 0.0
            for price, size in levels:
                if limit is not None and ((side == Side.BUY and price > limit) or (side == Side.SELL and price < limit)):
                    break
                take = min(size, remaining)
                cost += take * price
                remaining -= take
                if remaining <= 1e-12:
                    break
            if remaining <= 1e-12:
                avg = cost / qty
                return avg * (1 + slip) if side == Side.BUY else avg * (1 - slip)
        bid, ask = self._bid_ask(symbol)
        ref = ask if side == Side.BUY else bid
        if ref is None:
            return None
        price = ref * (1 + slip) if side == Side.BUY else ref * (1 - slip)
        if limit is not None:
            price = min(price, limit) if side == Side.BUY else max(price, limit)
        return price

    def _fill_taker(self, order: Order, limit: float | None = None) -> None:
        price = self._walk(order.symbol, order.side, order.qty, limit)
        if price is None:
            return
        self._apply_fill(order, price, maker=False)

    def _apply_fill(self, order: Order, price: float, maker: bool) -> Fill | None:
        ccy = self._ccy.get(order.symbol, self.currency)
        fx = self.fx(ccy)
        fee = self.fee_fn(order.symbol, order.side, order.qty, price, maker)
        pos = self.positions.setdefault(order.symbol, _Pos(currency=ccy))
        if order.side == Side.BUY:
            cost = (order.qty * price + fee) * fx
            if cost > self.cash + 1e-6:
                self._reject(order, "insufficient paper cash at fill")
                return None
            self.cash -= cost
            new_qty = pos.qty + order.qty
            pos.avg_price = (pos.avg_price * pos.qty + price * order.qty) / new_qty
            pos.qty = new_qty
        else:
            qty = min(order.qty, pos.qty)
            if qty <= 0:
                self._reject(order, "position already closed")
                return None
            order.qty = qty
            fee = self.fee_fn(order.symbol, order.side, qty, price, maker)
            self.cash += (qty * price - fee) * fx
            self.realized_pnl += (price - pos.avg_price) * qty * fx - fee * fx
            pos.qty -= qty
            if pos.qty <= 1e-12:
                del self.positions[order.symbol]
        self.fees_paid += fee * fx
        order.status = OrderStatus.FILLED
        order.filled_qty = order.qty
        order.avg_fill_price = price
        order.fee = fee
        fill = Fill(order.id, order.client_id, order.symbol, order.side, order.qty, price, fee,
                    order.purpose, self.clock())
        self.fills.append(fill)
        self._unread_fills.append(fill)
        if order.oco_group:
            for o in self.orders.values():
                if o.oco_group == order.oco_group and o.id != order.id and o.is_open:
                    o.status = OrderStatus.CANCELLED
        return fill

    def _after_fill(self, order: Order, req: OrderRequest, rules: InstrumentRules) -> None:
        """Attach protective stop / take-profit children once an entry fills."""
        if order.side != Side.BUY or (req.stop_loss is None and req.take_profit is None):
            return
        group = f"OCO-{order.id}"
        if req.stop_loss is not None:
            self.place(OrderRequest(req.symbol, Side.SELL, order.filled_qty, OrderType.STOP_LOSS,
                                    stop_price=req.stop_loss, purpose=Purpose.STOP),
                       rules, parent_id=order.id, oco_group=group)
        if req.take_profit is not None:
            self.place(OrderRequest(req.symbol, Side.SELL, order.filled_qty, OrderType.LIMIT,
                                    limit_price=req.take_profit, purpose=Purpose.TAKE_PROFIT),
                       rules, parent_id=order.id, oco_group=group)

    def _match(self, symbol: str) -> list[Fill]:
        bid, ask = self._bid_ask(symbol)
        new: list[Fill] = []
        for o in list(self.orders.values()):
            if o.symbol != symbol or not o.is_open:
                continue
            filled: Fill | None = None
            if o.order_type == OrderType.STOP_LOSS and bid is not None and bid <= (o.stop_price or 0):
                price = self._walk(symbol, Side.SELL, o.qty, None)
                if price is not None:
                    filled = self._apply_fill(o, price, maker=False)
            elif o.order_type == OrderType.LIMIT:
                if o.side == Side.BUY and ask is not None and ask <= (o.limit_price or 0):
                    filled = self._apply_fill(o, o.limit_price or ask, maker=True)
                elif o.side == Side.SELL and bid is not None and bid >= (o.limit_price or 1e300):
                    filled = self._apply_fill(o, o.limit_price or bid, maker=True)
            if filled:
                new.append(filled)
                child = self._children.pop(o.id, None)
                if child:
                    self._after_fill(o, *child)
        return new

    def on_bar(self, symbol: str, bar: Bar, spread_bps: float = 10.0) -> list[Fill]:
        """Backtest: process one bar (open, then intrabar low/high, then close)."""
        half = spread_bps / 20_000
        fills = self.update_quote(Quote(symbol, bar.open * (1 - half), bar.open * (1 + half), bar.open,
                                        bar.volume, bar.ts))
        slip = self.slippage_bps / 10_000
        for o in list(self.orders.values()):
            if o.symbol != symbol or not o.is_open:
                continue
            f: Fill | None = None
            if o.order_type == OrderType.STOP_LOSS and bar.low <= (o.stop_price or 0):
                f = self._apply_fill(o, min(o.stop_price or bar.open, bar.open) * (1 - slip), maker=False)
            elif o.order_type == OrderType.LIMIT and o.side == Side.BUY and bar.low < (o.limit_price or 0):
                f = self._apply_fill(o, min(o.limit_price or bar.open, bar.open), maker=True)
            elif o.order_type == OrderType.LIMIT and o.side == Side.SELL and bar.high > (o.limit_price or 1e300):
                f = self._apply_fill(o, max(o.limit_price or bar.open, bar.open), maker=True)
            if f:
                fills.append(f)
                child = self._children.pop(o.id, None)
                if child:
                    self._after_fill(o, *child)
        fills += self.update_quote(Quote(symbol, bar.close * (1 - half), bar.close * (1 + half), bar.close,
                                         bar.volume, bar.ts))
        return fills

    # ------------------------------------------------------------------ account

    def take_fills(self) -> list[Fill]:
        out, self._unread_fills = self._unread_fills, []
        return out

    def get_positions(self) -> dict[str, Position]:
        return {s: Position(s, p.qty, p.avg_price, p.currency) for s, p in self.positions.items() if p.qty > 0}

    def balances(self) -> dict[str, Balance]:
        out = {self.currency: Balance(self.currency, self.cash, self.cash - self.reserved_cash())}
        for s, p in self.positions.items():
            asset = s.split("/")[0]
            out[asset] = Balance(asset, p.qty, p.qty)
        return out

    def reserved_cash(self) -> float:
        return sum(o.qty * (o.limit_price or 0) * self.fx(self._ccy.get(o.symbol, self.currency))
                   for o in self.open_orders() if o.side == Side.BUY)

    def equity(self) -> float:
        total = self.cash
        for s, p in self.positions.items():
            price = self.last_price(s) or p.avg_price
            total += p.qty * price * self.fx(p.currency)
        return total
