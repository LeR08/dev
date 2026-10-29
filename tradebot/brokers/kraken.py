"""Kraken Pro adapter (crypto spot quoted in ``quote_currency``, USDC by default; accounting stays in EUR).

* Public + private REST (api.kraken.com) and WebSocket v2 ticker stream.
* Test mode: orders go to the internal paper engine fed by live Kraken order
  books; optionally dry-run through ``AddOrder(validate=true)`` when keys exist.
* Live mode: post-only limit entries with a conditional stop-loss close attached.
* Respects the private call counter and backs off on ``EAPI:Rate limit exceeded``.
* A failed submission is never retried blindly: open/closed orders are checked
  by ``userref`` first to avoid duplicates.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import math
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any

import httpx

from tradebot.brokers.base import (
    Balance,
    Bar,
    Broker,
    BrokerAdapter,
    BrokerError,
    Fees,
    Fill,
    InstrumentRules,
    Mode,
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
    RateLimited,
    Side,
)
from tradebot.brokers.paper_engine import PaperEngine, pct_fee_fn
from tradebot.data.kraken_feed import KrakenFeed
from tradebot.engine.risk import ensure_approved
from tradebot.settings import KrakenCfg, Secrets

log = logging.getLogger(__name__)

API = "https://api.kraken.com"
WS_URL = "wss://ws.kraken.com/v2"
ASSET_ALIASES = {"XBT": "BTC", "XDG": "DOGE"}
COUNTER_LIMITS = {"starter": (15, 0.33), "intermediate": (20, 0.5), "pro": (20, 1.0)}
DEFAULT_FEES = Fees(maker=0.0025, taker=0.0040)


def norm_asset(code: str) -> str:
    return ASSET_ALIASES.get(code.upper(), code.upper())


def norm_symbol(wsname: str) -> str:
    base, _, quote = wsname.partition("/")
    return f"{norm_asset(base)}/{norm_asset(quote)}"


def userref_for(client_id: str) -> int:
    return int(client_id[:8], 16) & 0x7FFFFFFF


def sign(urlpath: str, data: dict, secret_b64: str) -> str:
    postdata = urllib.parse.urlencode(data)
    encoded = (str(data["nonce"]) + postdata).encode()
    message = urlpath.encode() + hashlib.sha256(encoded).digest()
    mac = hmac.new(base64.b64decode(secret_b64), message, hashlib.sha512)
    return base64.b64encode(mac.digest()).decode()


class _CallCounter:
    """Client-side mirror of Kraken's private API call counter."""

    def __init__(self, tier: str):
        self.max, self.decay = COUNTER_LIMITS[tier]
        self.value = 0.0
        self._t = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, cost: int = 1) -> None:
        async with self._lock:
            while True:
                now = time.monotonic()
                self.value = max(0.0, self.value - (now - self._t) * self.decay)
                self._t = now
                if self.value + cost <= self.max - 1:  # keep one unit of headroom
                    self.value += cost
                    return
                await asyncio.sleep((self.value + cost - self.max + 1) / self.decay)


class KrakenAdapter(BrokerAdapter):
    broker = Broker.KRAKEN

    def __init__(self, cfg: KrakenCfg, secrets: Secrets, mode_switch, paper: PaperEngine | None = None,
                 feed: KrakenFeed | None = None, db=None, client: httpx.AsyncClient | None = None,
                 paper_cash: float = 1000.0):
        self.cfg = cfg
        self.secrets = secrets
        self.mode_switch = mode_switch
        self.db = db
        self._client = client or httpx.AsyncClient(base_url=API, timeout=20)
        self.feed = feed or KrakenFeed(None, self._client)
        self._counter = _CallCounter(cfg.fee_tier)
        self._pairs: dict[str, dict] = {}  # normalized symbol -> AssetPairs entry
        self._by_altname: dict[str, str] = {}
        self._assets: dict[str, str] = {}  # raw code -> normalized
        self._fees: dict[str, Fees] = {}
        self._nonce = int(time.time() * 1000)
        self._seen_closed: set[str] = set()
        self._refs: dict[str, str] = {}  # userref -> our client_id
        self._last_fill_poll = time.time()
        self._connected = False
        self._status = "unknown"
        self._fx: dict[str, tuple[float, float]] = {}  # currency -> (EUR per unit, monotonic time)
        self.paper = paper or PaperEngine("kraken", paper_cash, pct_fee_fn(self._fee_for),
                                          slippage_bps=cfg.execution.paper_slippage_bps, financing=cfg.financing,
                                          fx=self.fx_rate)

    # ------------------------------------------------------------------ basics

    @property
    def mode(self) -> Mode:
        return self.mode_switch.mode(Broker.KRAKEN)

    @property
    def connected(self) -> bool:
        return self._connected

    async def close(self) -> None:
        await self._client.aclose()

    async def _public(self, method: str, params: dict | None = None) -> Any:
        backoff = 1.0
        for attempt in range(4):
            try:
                r = await self._client.get(f"/0/public/{method}", params=params)
                r.raise_for_status()
                data = r.json()
            except httpx.HTTPError as exc:
                if attempt == 3:
                    raise BrokerError(f"Kraken public {method} failed: {type(exc).__name__}") from exc
                await asyncio.sleep(backoff)
                backoff *= 2
                continue
            errors = data.get("error") or []
            if any("Rate limit" in e or "Too many requests" in e for e in errors):
                await asyncio.sleep(backoff)
                backoff *= 2
                continue
            if errors:
                raise BrokerError(f"Kraken {method}: {errors}")
            return data["result"]
        raise RateLimited(f"Kraken public {method}: rate limited")

    def _next_nonce(self) -> int:
        self._nonce = max(self._nonce + 1, int(time.time() * 1000))
        return self._nonce

    async def _private(self, method: str, data: dict | None = None, cost: int = 1, retry: bool = True) -> Any:
        if not self.secrets.has_kraken_keys:
            raise BrokerError("Kraken API keys missing (.env)")
        path = f"/0/private/{method}"
        backoff = 2.0
        for attempt in range(4 if retry else 1):
            await self._counter.acquire(cost)
            body = {"nonce": self._next_nonce(), **(data or {})}
            headers = {
                "API-Key": self.secrets.kraken_api_key.get_secret_value(),
                "API-Sign": sign(path, body, self.secrets.kraken_api_secret.get_secret_value()),
                "Content-Type": "application/x-www-form-urlencoded",
            }
            try:
                r = await self._client.post(path, content=urllib.parse.urlencode(body), headers=headers)
                r.raise_for_status()
                payload = r.json()
            except httpx.HTTPError as exc:
                raise BrokerError(f"Kraken private {method} transport error: {type(exc).__name__}") from exc
            errors = payload.get("error") or []
            if any("Rate limit exceeded" in e for e in errors):
                log.warning("Kraken rate limit on %s, backing off %.0fs", method, backoff, extra={"broker": "kraken"})
                self._counter.value = self._counter.max
                await asyncio.sleep(backoff)
                backoff *= 2
                continue
            if errors:
                raise OrderRejected(f"Kraken {method}: {errors}") if method in ("AddOrder", "CancelOrder") \
                    else BrokerError(f"Kraken {method}: {errors}")
            return payload["result"]
        raise RateLimited(f"Kraken {method}: rate limit exceeded")

    # ------------------------------------------------------------------ connect / metadata

    async def connect(self) -> None:
        status = await self._public("SystemStatus")
        self._status = status.get("status", "unknown")
        assets = await self._public("Assets")
        self._assets = {code: norm_asset(info.get("altname", code)) for code, info in assets.items()}
        pairs = await self._public("AssetPairs")
        self._pairs.clear()
        for key, p in pairs.items():
            if "wsname" not in p or p.get("status", "online") != "online":
                continue
            sym = norm_symbol(p["wsname"])
            p = {**p, "_key": key}
            self._pairs[sym] = p
            self._by_altname[p["altname"]] = sym
            self._by_altname[key] = sym
            if self.db is not None:
                self.db.upsert_instrument("kraken", self._rules_from_pair(sym, p), {"altname": p["altname"]})
        await self._load_fees()
        await self.fx_to_eur(self.cfg.quote_currency)
        self._connected = True
        log.info("Kraken connected: %d pairs, status %s", len(self._pairs), self._status, extra={"broker": "kraken"})

    async def _load_fees(self) -> None:
        for sym, p in self._pairs.items():
            taker = float(p["fees"][0][1]) / 100 if p.get("fees") else DEFAULT_FEES.taker
            maker = float(p["fees_maker"][0][1]) / 100 if p.get("fees_maker") else taker
            self._fees[sym] = Fees(maker, taker)
        if self.secrets.has_kraken_keys:
            try:
                eur = [p["altname"] for s, p in self._pairs.items() if s.endswith("/" + self.cfg.quote_currency)][:20]
                tv = await self._private("TradeVolume", {"pair": ",".join(eur)})
                for alt, f in (tv.get("fees") or {}).items():
                    sym = self._by_altname.get(alt)
                    if sym:
                        maker = (tv.get("fees_maker") or {}).get(alt, f)
                        self._fees[sym] = Fees(float(maker["fee"]) / 100, float(f["fee"]) / 100)
            except BrokerError as exc:
                log.warning("Kraken fee tier unavailable, using public schedule: %s", exc, extra={"broker": "kraken"})

    def _fee_for(self, symbol: str) -> Fees:
        return self._fees.get(symbol, DEFAULT_FEES)

    def _rules_from_pair(self, symbol: str, p: dict) -> InstrumentRules:
        tick = float(p.get("tick_size") or 10 ** -int(p.get("pair_decimals", 2)))
        lev_buy = [int(x) for x in p.get("leverage_buy") or []]
        lev_sell = [int(x) for x in p.get("leverage_sell") or []]
        return InstrumentRules(symbol=symbol, currency=symbol.split("/")[1],
                               min_qty=float(p.get("ordermin", 0) or 0),
                               qty_step=10 ** -int(p.get("lot_decimals", 8)), tick_size=tick,
                               min_notional=float(p.get("costmin", 0) or 0),
                               max_leverage=float(max(lev_buy, default=1)),
                               shortable=bool(lev_sell))

    def margin_leverage(self, symbol: str, req: OrderRequest) -> int | None:
        """Kraken ``leverage`` parameter for a margin order, or None for a plain spot order.

        Kraken's per-order leverage sets the collateral used; the position size (and
        therefore the account leverage) comes from the volume chosen by the RiskManager.
        Shorts always need margin, so they use at least the pair's smallest leverage.
        """
        p = self._pair(symbol)
        short = req.position_side.value == "short"
        options = sorted(int(x) for x in (p.get("leverage_sell") if short else p.get("leverage_buy")) or [])
        if not short and req.leverage <= 1:
            return None
        if not options:
            raise OrderRejected(f"{symbol}: margin {'short' if short else 'long'} not available on Kraken")
        want = max(2, math.ceil(req.leverage))
        return next((o for o in options if o >= want), options[-1])

    def _pair(self, symbol: str) -> dict:
        p = self._pairs.get(symbol)
        if p is None:
            raise BrokerError(f"unknown Kraken pair {symbol}")
        return p

    async def get_rules(self, symbol: str) -> InstrumentRules:
        return self._rules_from_pair(symbol, self._pair(symbol))

    async def list_symbols(self) -> list[str]:
        q = self.cfg.quote_currency
        return sorted(s for s in self._pairs if s.endswith("/" + q))

    def has_pair(self, symbol: str) -> bool:
        return symbol in self._pairs

    # ------------------------------------------------------------------ market data

    def _quote_from_ticker(self, symbol: str, t: dict) -> Quote:
        return Quote(symbol, float(t["b"][0]), float(t["a"][0]), float(t["c"][0]), float(t["v"][1]))

    async def get_quotes(self, symbols: list[str]) -> dict[str, Quote]:
        out: dict[str, Quote] = {}
        alts = [self._pair(s)["altname"] for s in symbols if s in self._pairs]
        for i in range(0, len(alts), 50):
            res = await self._public("Ticker", {"pair": ",".join(alts[i:i + 50])})
            for key, t in res.items():
                sym = self._by_altname.get(key)
                if sym:
                    out[sym] = self._quote_from_ticker(sym, t)
        return out

    async def get_quote(self, symbol: str) -> Quote:
        q = (await self.get_quotes([symbol])).get(symbol)
        if q is None:
            raise BrokerError(f"no Kraken ticker for {symbol}")
        return q

    async def get_orderbook(self, symbol: str, depth: int = 10) -> OrderBook:
        res = await self._public("Depth", {"pair": self._pair(symbol)["altname"], "count": depth})
        book = next(iter(res.values()))
        ob = OrderBook(symbol, tuple((float(p), float(q)) for p, q, *_ in book["bids"]),
                       tuple((float(p), float(q)) for p, q, *_ in book["asks"]))
        if self.mode == Mode.TEST:
            self.paper.update_book(ob)
        return ob

    async def get_bars(self, symbol: str, limit: int = 200) -> list[Bar]:
        return await self.feed.bars(symbol, self._pair(symbol)["altname"], self.cfg.bars.interval_minutes, limit)

    async def get_fees(self, symbol: str) -> Fees:
        return self._fee_for(symbol)

    async def is_market_open(self, symbol: str, now: datetime | None = None) -> bool:
        return self._status == "online" and symbol in self._pairs  # 24/7 when the exchange is online

    async def stream(self, symbols: list[str], callback: QuoteCallback) -> None:
        """WebSocket v2 ticker stream with reconnect; falls back to REST polling."""
        try:
            import websockets
        except ImportError:  # pragma: no cover
            websockets = None
        backoff = 1.0
        while True:
            try:
                if websockets is None:
                    raise RuntimeError("websockets not installed")
                async with websockets.connect(WS_URL, ping_interval=20) as ws:
                    await ws.send(json.dumps({"method": "subscribe",
                                              "params": {"channel": "ticker", "symbol": symbols}}))
                    backoff = 1.0
                    async for raw in ws:
                        msg = json.loads(raw)
                        if msg.get("channel") != "ticker" or msg.get("type") not in ("snapshot", "update"):
                            continue
                        for t in msg.get("data", []):
                            q = Quote(t["symbol"], float(t["bid"]), float(t["ask"]), float(t["last"]),
                                      float(t.get("volume", 0)))
                            r = callback(q)
                            if asyncio.iscoroutine(r):
                                await r
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                log.warning("Kraken WS disconnected (%s); polling then reconnecting in %.0fs",
                            type(exc).__name__, backoff, extra={"broker": "kraken"})
                try:
                    for q in (await self.get_quotes(symbols)).values():
                        r = callback(q)
                        if asyncio.iscoroutine(r):
                            await r
                except BrokerError:
                    pass
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    # ------------------------------------------------------------------ account

    def _norm_balance_code(self, code: str) -> str | None:
        if "." in code:  # staked / earn variants are not tradable spot balance
            return None
        return self._assets.get(code, norm_asset(code))

    async def get_balances(self) -> dict[str, Balance]:
        if self.mode == Mode.TEST:
            return self.paper.balances()
        res = await self._private("Balance")
        out: dict[str, Balance] = {}
        for code, amount in res.items():
            a = self._norm_balance_code(code)
            if a and float(amount) > 0:
                out[a] = Balance(a, float(amount), float(amount))
        return out

    async def get_positions(self) -> dict[str, Position]:
        if self.mode == Mode.TEST:
            return self.paper.get_positions()
        out: dict[str, Position] = {}
        q = self.cfg.quote_currency
        for asset, bal in (await self.get_balances()).items():
            sym = f"{asset}/{q}"
            if asset != q and sym in self._pairs and bal.total >= float(self._pairs[sym].get("ordermin", 0) or 0):
                out[sym] = Position(sym, bal.total, 0.0, q)
        # margin positions (longs with leverage, shorts) are not in Balance
        res = await self._private("OpenPositions", {"docalcs": "true"})
        for raw in (res or {}).values():
            sym = self._by_altname.get(raw.get("pair", ""))
            if sym is None:
                continue
            qty = float(raw.get("vol", 0)) - float(raw.get("vol_closed", 0))
            signed = qty if raw.get("type") == "buy" else -qty
            prev = out.get(sym)
            total = (prev.qty if prev else 0.0) + signed
            avg = float(raw.get("cost", 0)) / float(raw.get("vol", 1) or 1)
            out[sym] = Position(sym, total, avg, q)
        return out

    async def get_equity(self) -> tuple[float, float]:
        if self.mode == Mode.TEST:
            for sym in list(self.paper.positions):
                try:
                    await self.get_orderbook(sym, 10)
                except BrokerError:
                    pass
            return self.paper.equity(), self.paper.cash - self.paper.reserved_cash()
        q = self.cfg.quote_currency
        try:
            # equity in EUR, whatever the quote currency: includes unrealised margin P&L ("e"), free margin ("mf")
            tb = await self._private("TradeBalance", {"asset": "ZEUR"})
            return float(tb["e"]), float(tb.get("mf", tb["e"]))
        except (BrokerError, KeyError):
            pass
        fx = await self.fx_to_eur(q)
        bals = await self.get_balances()
        cash = bals.get("EUR", Balance("EUR", 0, 0)).total + (bals[q].total * fx if q in bals and q != "EUR" else 0.0)
        syms = [f"{a}/{q}" for a in bals if a not in (q, "EUR") and f"{a}/{q}" in self._pairs]
        quotes = await self.get_quotes(syms) if syms else {}
        value = sum(bals[s.split("/")[0]].total * quotes[s].bid * fx for s in syms if s in quotes)
        return cash + value, cash

    # ------------------------------------------------------------------ currency

    async def fx_to_eur(self, currency: str) -> float:
        """EUR value of one unit of ``currency`` from Kraken's own ticker (USDC/EUR, EUR/USD...), cached 60 s."""
        if currency == "EUR":
            return 1.0
        hit = self._fx.get(currency)
        if hit and time.monotonic() - hit[1] < 60:
            return hit[0]
        rate = None
        try:
            if self.has_pair(f"{currency}/EUR"):
                rate = (await self.get_quote(f"{currency}/EUR")).mid
            elif self.has_pair(f"EUR/{currency}"):
                rate = 1 / (await self.get_quote(f"EUR/{currency}")).mid
        except (BrokerError, ZeroDivisionError):
            rate = None
        if rate is None or rate <= 0:
            rate = hit[0] if hit else self.cfg.fx_fallback_to_eur.get(currency, 1.0)
        self._fx[currency] = (rate, time.monotonic())
        return rate

    def fx_rate(self, currency: str) -> float:
        if currency == "EUR":
            return 1.0
        hit = self._fx.get(currency)
        return hit[0] if hit else self.cfg.fx_fallback_to_eur.get(currency, 1.0)

    # ------------------------------------------------------------------ orders

    def _fmt(self, value: float, decimals: int) -> str:
        return f"{value:.{decimals}f}"

    async def place_order(self, req: OrderRequest) -> Order:
        ensure_approved(req, self.mode)
        pair = self._pair(req.symbol)
        rules = await self.get_rules(req.symbol)
        qty = rules.round_qty(req.qty)
        if qty < rules.min_qty or qty <= 0:
            raise OrderRejected(f"{req.symbol}: qty {req.qty} below Kraken minimum {rules.min_qty}")
        req.qty = qty
        for attr, side in (("limit_price", req.side), ("stop_price", Side.SELL), ("stop_loss", Side.SELL)):
            v = getattr(req, attr)
            if v is not None:
                setattr(req, attr, rules.round_price(v, side))
        if req.limit_price is not None and qty * req.limit_price < rules.min_notional:
            raise OrderRejected(f"{req.symbol}: notional below Kraken minimum cost {rules.min_notional}")

        data = self._addorder_payload(req, pair)
        if self.mode == Mode.TEST:
            if req.opens and req.position_side.value == "short" and not rules.shortable:
                raise OrderRejected(f"{req.symbol}: no margin short on Kraken for this pair")
            if self.cfg.execution.validate_orders_in_test and self.secrets.has_kraken_keys:
                try:
                    await self._private("AddOrder", {**data, "validate": "true"})
                except OrderRejected as exc:
                    if "Insufficient funds" not in str(exc):
                        raise
                    # paper balance is simulated: an empty real account must not block test mode
                    log.info("dry-run: real account lacks funds (ignored in test mode)", extra={"broker": "kraken"})
            try:
                await self.get_orderbook(req.symbol, 10)
            except BrokerError:
                pass
            order = self.paper.place(req, rules)
            if order.status == OrderStatus.REJECTED:
                raise OrderRejected(order.reason)
            return order
        return await self._submit_live(req, data)

    def _addorder_payload(self, req: OrderRequest, pair: dict) -> dict:
        pd, ld = int(pair.get("pair_decimals", 2)), int(pair.get("lot_decimals", 8))
        data: dict[str, Any] = {
            "pair": pair["altname"],
            "type": str(req.side),
            "ordertype": str(req.order_type),
            "volume": self._fmt(req.qty, ld),
            "userref": userref_for(req.client_id),
        }
        if req.order_type == OrderType.LIMIT:
            data["price"] = self._fmt(req.limit_price, pd)
            if req.post_only:
                data["oflag"] = "post"
        elif req.order_type == OrderType.STOP_LOSS:
            data["price"] = self._fmt(req.stop_price, pd)
        lev = self.margin_leverage(req.symbol, req)
        if lev is not None:
            data["leverage"] = str(lev)
            if not req.opens:
                data["reduce_only"] = "true"  # closing a margin position never opens a new one
        if req.stop_loss is not None and req.opens:
            data["close[ordertype]"] = "stop-loss"  # protective close attached at the broker (long or short)
            data["close[price]"] = self._fmt(req.stop_loss, pd)
        return data

    async def _find_by_userref(self, userref: int) -> list[str]:
        ids: list[str] = []
        for method in ("OpenOrders", "ClosedOrders"):
            try:
                res = await self._private(method, {"userref": userref})
            except BrokerError:
                continue
            key = "open" if method == "OpenOrders" else "closed"
            ids += list((res.get(key) or {}).keys())
        return ids

    async def _submit_live(self, req: OrderRequest, data: dict) -> Order:
        userref = data["userref"]
        self._refs[str(userref)] = req.client_id
        for attempt in range(3):
            try:
                res = await self._private("AddOrder", data, retry=False)
                txid = (res.get("txid") or [""])[0]
                break
            except OrderRejected:
                raise
            except BrokerError as exc:
                # unknown outcome: never resend before checking what Kraken has
                existing = await self._find_by_userref(userref)
                if existing:
                    txid = existing[0]
                    log.warning("AddOrder outcome unclear, found existing order %s", txid, extra={"broker": "kraken"})
                    break
                if attempt == 2:
                    raise
                log.warning("AddOrder failed (%s), not found at Kraken, retrying", exc, extra={"broker": "kraken"})
                await asyncio.sleep(2 ** attempt)
        return Order(id=txid, client_id=req.client_id, symbol=req.symbol, side=req.side, qty=req.qty,
                     order_type=req.order_type, status=OrderStatus.OPEN, limit_price=req.limit_price,
                     stop_price=req.stop_price, purpose=req.purpose)

    async def cancel_order(self, order_id: str) -> bool:
        if self.mode == Mode.TEST or order_id.startswith("PKR-"):
            return self.paper.cancel(order_id)
        res = await self._private("CancelOrder", {"txid": order_id})
        return int(res.get("count", 0)) > 0

    def _order_from_kraken(self, txid: str, o: dict) -> Order | None:
        d = o.get("descr", {})
        sym = self._by_altname.get(d.get("pair", ""))
        if sym is None:
            return None
        status = {"open": OrderStatus.OPEN, "pending": OrderStatus.PENDING, "closed": OrderStatus.FILLED,
                  "canceled": OrderStatus.CANCELLED, "expired": OrderStatus.CANCELLED}.get(o.get("status"),
                                                                                         OrderStatus.OPEN)
        otype = d.get("ordertype", "limit")
        kind = OrderType.STOP_LOSS if otype == "stop-loss" else OrderType.MARKET if otype == "market" \
            else OrderType.LIMIT
        price = float(d.get("price") or 0) or None
        ref = str(o.get("userref", ""))
        return Order(id=txid, client_id=self._refs.get(ref, ref), symbol=sym, side=Side(d.get("type", "buy")),
                     qty=float(o.get("vol", 0)), order_type=kind, status=status,
                     limit_price=price if kind == OrderType.LIMIT else None,
                     stop_price=price if kind == OrderType.STOP_LOSS else None,
                     filled_qty=float(o.get("vol_exec", 0)), avg_fill_price=float(o.get("price", 0) or 0),
                     fee=float(o.get("fee", 0) or 0),
                     purpose=Purpose.STOP if kind == OrderType.STOP_LOSS else Purpose.ENTRY)

    async def get_open_orders(self) -> list[Order]:
        if self.mode == Mode.TEST:
            return self.paper.open_orders()
        res = await self._private("OpenOrders")
        return [o for txid, raw in (res.get("open") or {}).items() if (o := self._order_from_kraken(txid, raw))]

    async def poll_fills(self) -> list[Fill]:
        if self.mode == Mode.TEST:
            for sym in {o.symbol for o in self.paper.open_orders()}:
                try:
                    await self.get_orderbook(sym, 10)
                except BrokerError:
                    pass
            return self.paper.take_fills()
        start = self._last_fill_poll - 120
        self._last_fill_poll = time.time()
        res = await self._private("ClosedOrders", {"start": int(start)})
        fills = []
        for txid, raw in (res.get("closed") or {}).items():
            if txid in self._seen_closed or float(raw.get("vol_exec", 0)) <= 0:
                continue
            self._seen_closed.add(txid)
            o = self._order_from_kraken(txid, raw)
            if o is None:
                continue
            ts = datetime.fromtimestamp(float(raw.get("closetm", time.time())), timezone.utc)
            fills.append(Fill(txid, o.client_id, o.symbol, o.side, o.filled_qty, o.avg_fill_price, o.fee,
                              o.purpose, ts))
        return fills

    async def withdrawal_enabled(self) -> bool | None:
        """Probe whether the API key can withdraw. True = can withdraw (refuse live)."""
        if not self.secrets.has_kraken_keys:
            return None
        try:
            await self._private("WithdrawMethods", {"asset": "XBT"})
            return True
        except BrokerError as exc:
            if "Permission denied" in str(exc):
                return False
            return None
