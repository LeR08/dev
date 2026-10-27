"""Interactive Brokers adapter (stocks/ETFs, cash account) via a local IB Gateway.

* Connects to localhost only, through ``ib_async``.
* Test mode uses the native IBKR paper account on its own Gateway port; the
  adapter refuses to connect to the live port while test mode is ON, and
  refuses a non-paper account (paper ids start with "D").
* v1 runs on free delayed market data (``reqMarketDataType(3)``).
* Entries are bracket orders (limit entry + take-profit + stop-loss children);
  orders outside exchange sessions (incl. holidays) are refused.
* Historical-data requests are queued to respect IBKR pacing limits.
"""

from __future__ import annotations

import asyncio
import logging
import math
import time
from collections import deque
from datetime import date, datetime, timezone
from typing import Any, Callable
from zoneinfo import ZoneInfo

from tradebot.brokers.base import (
    Balance,
    Bar,
    Broker,
    BrokerAdapter,
    BrokerError,
    Fees,
    Fill,
    InstrumentRules,
    MarketClosed,
    Mode,
    ModeViolation,
    Order,
    OrderBook,
    OrderRejected,
    OrderRequest,
    OrderStatus,
    OrderType,
    Position,
    Purpose,
    Quote,
    QuoteCallback,
    Side,
    utcnow,
)
from tradebot.data.cache import BarCache
from tradebot.engine.risk import ensure_approved
from tradebot.settings import IBKRCfg, IBKRFeesCfg, Secrets, UniverseIBKR

log = logging.getLogger(__name__)

LOCALHOSTS = {"127.0.0.1", "localhost", "::1"}
TZ_ALIASES = {"US/Eastern": "America/New_York", "US/Central": "America/Chicago", "MET": "Europe/Paris",
              "CET": "Europe/Paris", "GB-Eire": "Europe/London", "GMT": "Europe/London"}


# --------------------------------------------------------------------------- helpers


def _tz(name: str | None) -> ZoneInfo:
    name = name or "America/New_York"
    try:
        return ZoneInfo(TZ_ALIASES.get(name, name))
    except Exception:  # noqa: BLE001
        return ZoneInfo("UTC")


def parse_liquid_hours(spec: str, tz_name: str | None) -> list[tuple[datetime, datetime]]:
    """Parse IBKR ``liquidHours`` ("20260127:0930-20260127:1600;20260128:CLOSED;...") into UTC sessions."""
    tz = _tz(tz_name)
    out = []
    for part in (spec or "").split(";"):
        part = part.strip()
        if not part or "CLOSED" in part or "-" not in part:
            continue
        a, b = part.split("-", 1)
        try:
            start = datetime.strptime(a, "%Y%m%d:%H%M").replace(tzinfo=tz)
            end = datetime.strptime(b, "%Y%m%d:%H%M").replace(tzinfo=tz)
        except ValueError:
            continue
        out.append((start.astimezone(timezone.utc), end.astimezone(timezone.utc)))
    return out


def session_at(sessions: list[tuple[datetime, datetime]], now: datetime) -> tuple[datetime, datetime] | None:
    return next(((s, e) for s, e in sessions if s <= now < e), None)


class IBKRFeeSchedule:
    """Fee schedule from config (fees in instrument currency)."""

    def __init__(self, cfg: IBKRFeesCfg, currency_of: Callable[[str], str]):
        self.cfg = cfg
        self.currency_of = currency_of

    def __call__(self, symbol: str, side: Side, qty: float, price: float, maker: bool) -> float:
        c = self.cfg
        notional = qty * price
        if self.currency_of(symbol) == "USD":
            fee = max(c.us_min_per_order, qty * c.us_per_share)
            return min(fee, notional * c.us_max_pct / 100) if notional > 0 else fee
        return max(c.eu_min_per_order, notional * c.eu_pct / 100)


class Pacing:
    """IBKR historical-data pacing: <=60 requests / 10 min, >=2 s apart (conservative)."""

    def __init__(self, max_requests: int = 50, window: float = 600.0, min_gap: float = 2.0):
        self.max_requests, self.window, self.min_gap = max_requests, window, min_gap
        self._times: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                while self._times and now - self._times[0] > self.window:
                    self._times.popleft()
                if len(self._times) >= self.max_requests:
                    await asyncio.sleep(self.window - (now - self._times[0]) + 0.1)
                    continue
                if self._times and now - self._times[-1] < self.min_gap:
                    await asyncio.sleep(self.min_gap - (now - self._times[-1]))
                    continue
                self._times.append(time.monotonic())
                return


def _num(x: Any) -> float:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if math.isnan(v) or v < 0 else v


# --------------------------------------------------------------------------- adapter


class IBKRAdapter(BrokerAdapter):
    broker = Broker.IBKR

    def __init__(self, cfg: IBKRCfg, universe: UniverseIBKR, mode_switch, secrets: Secrets,
                 bar_cache: BarCache | None = None, ib_factory: Callable[[], Any] | None = None):
        self.cfg = cfg
        self.universe = universe
        self.mode_switch = mode_switch
        self.secrets = secrets
        self.bar_cache = bar_cache
        self._ib_factory = ib_factory or self._default_factory
        self._ib: Any = None
        self._port: int | None = None
        self._contracts: dict[str, Any] = {}
        self._details: dict[str, Any] = {}
        self._sessions: dict[str, tuple[date, list[tuple[datetime, datetime]]]] = {}
        self._seen_execs: set[str] = set()
        self._pacing = Pacing()
        self._fx_cache: dict[str, tuple[float, float]] = {}
        self.fee_schedule = IBKRFeeSchedule(cfg.fees, self.currency_of)
        mode_switch.add_listener(self._on_mode_change)

    @staticmethod
    def _default_factory():
        from ib_async import IB

        return IB()

    # ------------------------------------------------------------------ connection

    @property
    def mode(self) -> Mode:
        return self.mode_switch.mode(Broker.IBKR)

    @property
    def connected(self) -> bool:
        return self._ib is not None and self._ib.isConnected()

    def port_for_mode(self, mode: Mode) -> int:
        return self.cfg.gateway.live_port if mode == Mode.LIVE else self.cfg.gateway.paper_port

    def check_port_allowed(self, port: int) -> None:
        g = self.cfg.gateway
        if g.paper_port == g.live_port:
            raise ModeViolation("paper and live Gateway ports must differ")
        if self.mode == Mode.TEST and port == g.live_port:
            raise ModeViolation(f"refusing to connect to the LIVE Gateway port {port} while test mode is ON")
        if self.mode == Mode.LIVE and port != g.live_port:
            raise ModeViolation("live mode must use the live Gateway port")

    async def connect(self, port: int | None = None) -> None:
        g = self.cfg.gateway
        if g.host not in LOCALHOSTS:
            raise ModeViolation("IB Gateway must run on this machine (localhost only)")
        port = port if port is not None else self.port_for_mode(self.mode)
        self.check_port_allowed(port)
        mode_at_connect = self.mode
        ib = self._ib_factory()
        try:
            await ib.connectAsync(g.host, port, clientId=g.client_id, timeout=g.connect_timeout_seconds)
        except Exception as exc:  # noqa: BLE001
            raise BrokerError(f"cannot reach IB Gateway on {g.host}:{port} ({type(exc).__name__})") from exc
        accounts = list(ib.managedAccounts() or [])
        if mode_at_connect == Mode.TEST and (not accounts or any(not a.startswith("D") for a in accounts)):
            ib.disconnect()
            raise ModeViolation("test mode requires an IBKR paper account (id starting with 'D')")
        if mode_at_connect == Mode.LIVE and self.secrets.ibkr_live_account not in accounts:
            ib.disconnect()
            raise ModeViolation("connected account does not match IBKR_LIVE_ACCOUNT")
        ib.reqMarketDataType(3)  # delayed data: free
        self._ib, self._port = ib, port
        log.info("IBKR connected on port %s (%s)", port, mode_at_connect, extra={"broker": "ibkr"})

    async def close(self) -> None:
        if self._ib is not None:
            self._ib.disconnect()
            self._ib = None

    def _on_mode_change(self, broker: Broker, mode: Mode, reason: str) -> None:
        if broker == Broker.IBKR and self._ib is not None:
            log.info("IBKR mode changed to %s: disconnecting from port %s", mode, self._port, extra={"broker": "ibkr"})
            self._ib.disconnect()
            self._ib = None

    async def _ensure(self) -> Any:
        if self.connected:
            if self._port != self.port_for_mode(self.mode):
                await self.close()
            else:
                return self._ib
        backoff = 1.0
        for attempt in range(4):
            try:
                await self.connect()
                return self._ib
            except ModeViolation:
                raise
            except BrokerError:
                if attempt == 3:
                    raise
                await asyncio.sleep(backoff)
                backoff *= 2
        raise BrokerError("IBKR reconnect failed")

    # ------------------------------------------------------------------ contracts

    def currency_of(self, symbol: str) -> str:
        e = self.universe.entry(symbol)
        return e.currency if e else "USD"

    async def _contract(self, symbol: str) -> Any:
        if symbol in self._contracts:
            return self._contracts[symbol]
        from ib_async import Stock

        e = self.universe.entry(symbol)
        if e is None:
            raise BrokerError(f"{symbol} is not in universe_ibkr.yaml")
        ib = await self._ensure()
        c = Stock(e.symbol, e.exchange, e.currency, primaryExchange=e.primary_exchange or "")
        qualified = await ib.qualifyContractsAsync(c)
        if not qualified:
            raise BrokerError(f"IBKR could not qualify {symbol}")
        self._contracts[symbol] = qualified[0]
        details = await ib.reqContractDetailsAsync(qualified[0])
        if details:
            self._details[symbol] = details[0]
        return qualified[0]

    async def get_rules(self, symbol: str) -> InstrumentRules:
        await self._contract(symbol)
        d = self._details.get(symbol)
        tick = _num(getattr(d, "minTick", 0.01)) or 0.01
        step = max(1.0, _num(getattr(d, "sizeIncrement", 1)) or 1.0)  # whole shares by default
        min_qty = max(1.0, _num(getattr(d, "minSize", 1)) or 1.0)
        return InstrumentRules(symbol, self.currency_of(symbol), min_qty=min_qty, qty_step=step, tick_size=tick)

    async def list_symbols(self) -> list[str]:
        return [i.symbol for i in self.universe.instruments]

    async def sessions(self, symbol: str, now: datetime | None = None) -> list[tuple[datetime, datetime]]:
        now = now or utcnow()
        cached = self._sessions.get(symbol)
        if cached and cached[0] == now.date():
            return cached[1]
        await self._contract(symbol)
        d = self._details.get(symbol)
        sess = parse_liquid_hours(getattr(d, "liquidHours", ""), getattr(d, "timeZoneId", None))
        self._sessions[symbol] = (now.date(), sess)
        return sess

    async def current_session(self, symbol: str, now: datetime | None = None) -> tuple[datetime, datetime] | None:
        now = now or utcnow()
        return session_at(await self.sessions(symbol, now), now)

    async def is_market_open(self, symbol: str, now: datetime | None = None) -> bool:
        return await self.current_session(symbol, now) is not None

    # ------------------------------------------------------------------ market data

    async def get_quote(self, symbol: str) -> Quote:
        ib = await self._ensure()
        c = await self._contract(symbol)
        tickers = await ib.reqTickersAsync(c)
        if not tickers:
            raise BrokerError(f"no IBKR quote for {symbol}")
        t = tickers[0]
        last = _num(t.last) or _num(t.close)
        return Quote(symbol, _num(t.bid), _num(t.ask), last, _num(t.volume))

    async def get_orderbook(self, symbol: str, depth: int = 10) -> OrderBook:
        """Market depth is a paid feed: return top of book from the delayed quote."""
        ib = await self._ensure()
        c = await self._contract(symbol)
        t = (await ib.reqTickersAsync(c))[0]
        bids = ((_num(t.bid), _num(t.bidSize)),) if _num(t.bid) else ()
        asks = ((_num(t.ask), _num(t.askSize)),) if _num(t.ask) else ()
        return OrderBook(symbol, bids, asks)

    async def get_bars(self, symbol: str, limit: int = 200, intraday: bool = False) -> list[Bar]:
        ib = await self._ensure()
        c = await self._contract(symbol)
        b = self.cfg.bars
        size, duration = (b.intraday_bar_size, b.intraday_duration) if intraday else (b.bar_size, b.duration)
        await self._pacing.wait()
        raw = await ib.reqHistoricalDataAsync(c, endDateTime="", durationStr=duration, barSizeSetting=size,
                                              whatToShow="TRADES", useRTH=True, formatDate=2)
        bars = []
        for r in raw or []:
            d = r.date
            ts = d if isinstance(d, datetime) else datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            bars.append(Bar(ts, float(r.open), float(r.high), float(r.low), float(r.close), float(r.volume)))
        if self.bar_cache and bars:
            self.bar_cache.put("ibkr", symbol, size, bars)
        return bars[-limit:]

    async def avg_daily_volume(self, symbol: str, days: int = 20) -> float | None:
        cached = self.bar_cache.get("ibkr", symbol, self.cfg.bars.bar_size) if self.bar_cache else []
        bars = cached if len(cached) >= days else await self.get_bars(symbol, days)
        vols = [b.volume for b in bars[-days:]]
        return sum(vols) / len(vols) if vols else None

    async def get_fees(self, symbol: str) -> Fees:
        try:
            price = (await self.get_quote(symbol)).mid
        except BrokerError:
            price = 0.0
        if price <= 0:
            return Fees(0.001, 0.001)
        qty = max(1.0, math.floor(1000 / price))
        pct = self.fee_schedule(symbol, Side.BUY, qty, price, False) / (qty * price)
        return Fees(pct, pct)

    async def fx_to_eur(self, currency: str) -> float:
        if currency == "EUR":
            return 1.0
        hit = self._fx_cache.get(currency)
        if hit and time.monotonic() - hit[1] < 600:
            return hit[0]
        rate = self.cfg.fx_fallback_to_eur.get(currency, 1.0)
        try:
            from ib_async import Forex

            ib = await self._ensure()
            t = (await ib.reqTickersAsync(Forex(f"EUR{currency}")))[0]
            mid = (_num(t.bid) + _num(t.ask)) / 2 if _num(t.bid) and _num(t.ask) else _num(t.close)
            if mid > 0:
                rate = 1 / mid
        except Exception:  # noqa: BLE001
            pass
        self._fx_cache[currency] = (rate, time.monotonic())
        return rate

    async def stream(self, symbols: list[str], callback: QuoteCallback) -> None:
        ib = await self._ensure()
        tickers = {}
        for s in symbols:
            tickers[s] = ib.reqMktData(await self._contract(s))

        def on_update(t):
            sym = t.contract.symbol
            r = callback(Quote(sym, _num(t.bid), _num(t.ask), _num(t.last), _num(t.volume)))
            if asyncio.iscoroutine(r):
                asyncio.ensure_future(r)

        for t in tickers.values():
            t.updateEvent += on_update
        try:
            while True:
                await asyncio.sleep(3600)
        finally:
            for t in tickers.values():
                t.updateEvent -= on_update
                ib.cancelMktData(t.contract)

    # ------------------------------------------------------------------ account

    def _account_values(self) -> list[Any]:
        return list(self._ib.accountValues()) if self._ib else []

    async def get_balances(self) -> dict[str, Balance]:
        await self._ensure()
        out = {}
        for v in self._account_values():
            if v.tag == "CashBalance" and v.currency not in ("BASE", ""):
                amt = float(v.value)
                out[v.currency] = Balance(v.currency, amt, amt)
        return out

    async def get_positions(self) -> dict[str, Position]:
        ib = await self._ensure()
        out = {}
        for p in ib.positions():
            if p.position > 0:
                out[p.contract.symbol] = Position(p.contract.symbol, float(p.position), float(p.avgCost),
                                                  p.contract.currency)
        return out

    async def get_equity(self) -> tuple[float, float]:
        await self._ensure()
        eq = cash = None
        for v in self._account_values():
            if v.currency in (self.cfg.base_currency, "BASE"):
                if v.tag == "NetLiquidation":
                    eq = float(v.value)
                elif v.tag in ("TotalCashValue", "AvailableFunds") and cash is None:
                    cash = float(v.value)
        if eq is None:
            raise BrokerError("IBKR account values not available yet")
        return eq, cash if cash is not None else 0.0

    # ------------------------------------------------------------------ orders

    def _find_trade(self, client_id: str) -> Any:
        for t in self._ib.trades():
            if (t.order.orderRef or "").split(":")[0] == client_id:
                return t
        return None

    def _order_from_trade(self, t: Any) -> Order:
        o, st = t.order, t.orderStatus
        ref = o.orderRef or ""
        suffix = ref.split(":")[1] if ":" in ref else ""
        purpose = {"tp": Purpose.TAKE_PROFIT, "sl": Purpose.STOP}.get(suffix, Purpose.ENTRY if o.action == "BUY"
                                                                     else Purpose.EXIT)
        kind = {"LMT": OrderType.LIMIT, "MKT": OrderType.MARKET, "STP": OrderType.STOP_LOSS}.get(o.orderType,
                                                                                               OrderType.LIMIT)
        status = {"Filled": OrderStatus.FILLED, "Cancelled": OrderStatus.CANCELLED,
                  "ApiCancelled": OrderStatus.CANCELLED, "Inactive": OrderStatus.REJECTED,
                  "PendingSubmit": OrderStatus.PENDING, "ApiPending": OrderStatus.PENDING}.get(st.status,
                                                                                            OrderStatus.OPEN)
        return Order(id=str(o.orderId), client_id=ref.split(":")[0], symbol=t.contract.symbol,
                     side=Side.BUY if o.action == "BUY" else Side.SELL, qty=float(o.totalQuantity),
                     order_type=kind, status=status, limit_price=_num(o.lmtPrice) or None,
                     stop_price=_num(o.auxPrice) or None, filled_qty=float(st.filled or 0),
                     avg_fill_price=float(st.avgFillPrice or 0), purpose=purpose,
                     parent_id=str(o.parentId) if o.parentId else None)

    async def place_order(self, req: OrderRequest) -> Order:
        ensure_approved(req, self.mode)
        ib = await self._ensure()
        if not await self.is_market_open(req.symbol):
            raise MarketClosed(f"{req.symbol}: exchange session closed (orders only during market hours)")
        existing = self._find_trade(req.client_id)
        if existing is not None:  # never submit the same order twice
            return self._order_from_trade(existing)
        from ib_async import LimitOrder, MarketOrder, StopOrder

        c = await self._contract(req.symbol)
        rules = await self.get_rules(req.symbol)
        qty = rules.round_qty(req.qty)
        if qty < rules.min_qty:
            raise OrderRejected(f"{req.symbol}: quantity rounds below {rules.min_qty} share(s)")

        if req.side == Side.BUY:
            lp = rules.round_price(req.limit_price, Side.BUY)
            sl = rules.round_price(req.stop_loss, Side.SELL)
            if req.take_profit is not None:
                tp = rules.round_price(req.take_profit, Side.SELL)
                bracket = ib.bracketOrder("BUY", qty, lp, tp, sl)
                orders = [bracket.parent, bracket.takeProfit, bracket.stopLoss]
                suffixes = ["", ":tp", ":sl"]
            else:
                parent = LimitOrder("BUY", qty, lp, orderId=ib.client.getReqId(), transmit=False)
                stop = StopOrder("SELL", qty, sl, orderId=ib.client.getReqId(), parentId=parent.orderId,
                                 transmit=True)
                orders, suffixes = [parent, stop], ["", ":sl"]
            for o, sfx in zip(orders, suffixes):
                o.orderRef = req.client_id + sfx
                o.outsideRth = False
                o.tif = "DAY" if sfx == "" else "GTC"
        else:
            if req.order_type == OrderType.MARKET:
                o = MarketOrder("SELL", qty)
            else:
                o = LimitOrder("SELL", qty, rules.round_price(req.limit_price, Side.SELL))
            o.orderRef = req.client_id
            o.tif = "DAY"
            orders = [o]

        trades = [ib.placeOrder(c, o) for o in orders]
        await asyncio.sleep(0.5)
        parent_trade = trades[0]
        if parent_trade.orderStatus.status in ("Inactive", "Cancelled", "ApiCancelled"):
            msgs = "; ".join(e.message for e in parent_trade.log if e.message)
            raise OrderRejected(f"IBKR rejected {req.symbol}: {msgs or parent_trade.orderStatus.status}")
        return self._order_from_trade(parent_trade)

    async def cancel_order(self, order_id: str) -> bool:
        ib = await self._ensure()
        for t in ib.openTrades():
            if str(t.order.orderId) == str(order_id):
                ib.cancelOrder(t.order)
                return True
        return False

    async def get_open_orders(self) -> list[Order]:
        ib = await self._ensure()
        return [self._order_from_trade(t) for t in ib.openTrades()]

    async def poll_fills(self) -> list[Fill]:
        ib = await self._ensure()
        out = []
        for f in ib.fills():
            ex = f.execution
            if ex.execId in self._seen_execs:
                continue
            self._seen_execs.add(ex.execId)
            ref = ex.orderRef or ""
            suffix = ref.split(":")[1] if ":" in ref else ""
            side = Side.BUY if ex.side == "BOT" else Side.SELL
            purpose = {"tp": Purpose.TAKE_PROFIT, "sl": Purpose.STOP}.get(
                suffix, Purpose.ENTRY if side == Side.BUY else Purpose.EXIT)
            fee = _num(getattr(f.commissionReport, "commission", 0))
            ts = f.time if isinstance(f.time, datetime) else utcnow()
            out.append(Fill(str(ex.orderId), ref.split(":")[0], f.contract.symbol, side, float(ex.shares),
                            float(ex.price), fee, purpose, ts))
        return out
