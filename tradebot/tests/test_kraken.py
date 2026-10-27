from __future__ import annotations

import urllib.parse

import httpx
import pytest

from tradebot.brokers.base import Broker, Mode, OrderRequest, OrderType, Side, UnapprovedOrder
from tradebot.brokers.kraken import KrakenAdapter, norm_symbol, sign
from tradebot.engine.mode import ModeSwitch, Precondition, confirm_phrase
from tradebot.engine.risk import AccountState, RiskManager
from tradebot.settings import KrakenCfg, RiskConfig, Secrets
from pydantic import SecretStr


def test_signature_matches_kraken_documentation_example():
    secret = "kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg=="
    data = {"nonce": "1616492376594", "ordertype": "limit", "pair": "XBTUSD", "price": 37500, "type": "buy",
            "volume": 1.25}
    assert sign("/0/private/AddOrder", data, secret) == \
        "4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ=="


def test_symbol_normalisation():
    assert norm_symbol("XBT/EUR") == "BTC/EUR"
    assert norm_symbol("XDG/EUR") == "DOGE/EUR"


PAIRS = {
    "XXBTZEUR": {"altname": "XBTEUR", "wsname": "XBT/EUR", "base": "XXBT", "quote": "ZEUR", "pair_decimals": 1,
                 "lot_decimals": 8, "ordermin": "0.00005", "costmin": "0.5", "tick_size": "0.1",
                 "fees": [[0, 0.4]], "fees_maker": [[0, 0.25]], "status": "online"},
}


class KrakenMock:
    def __init__(self):
        self.private_calls: list[tuple[str, dict]] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.startswith("/0/public/"):
            method = path.rsplit("/", 1)[1]
            result = {
                "SystemStatus": {"status": "online"},
                "Assets": {"XXBT": {"altname": "XBT"}, "ZEUR": {"altname": "EUR"}},
                "AssetPairs": PAIRS,
                "Depth": {"XXBTZEUR": {"bids": [["60000.0", "2", 1]], "asks": [["60010.0", "2", 1]]}},
                "Ticker": {"XXBTZEUR": {"a": ["60010.0", "1", "1"], "b": ["60000.0", "1", "1"],
                                        "c": ["60005.0", "0.1"], "v": ["10", "100"]}},
            }[method]
            return httpx.Response(200, json={"error": [], "result": result})
        method = path.rsplit("/", 1)[1]
        assert request.headers["API-Key"] == "key" and request.headers["API-Sign"]
        body = dict(urllib.parse.parse_qsl(request.content.decode()))
        self.private_calls.append((method, body))
        if method == "AddOrder":
            return httpx.Response(200, json={"error": [], "result": {"txid": ["OABC-123"], "descr": {}}})
        if method == "WithdrawMethods":
            return httpx.Response(200, json={"error": ["EGeneral:Permission denied"]})
        return httpx.Response(200, json={"error": [], "result": {}})


def make_adapter(mock, mode=None, keys=True):
    secret = "a2V5c2VjcmV0"  # base64("keysecret")
    secrets = Secrets(kraken_api_key=SecretStr("key"), kraken_api_secret=SecretStr(secret)) if keys else Secrets()
    mode = mode or ModeSwitch()
    client = httpx.AsyncClient(base_url="https://api.kraken.com", transport=httpx.MockTransport(mock))
    return KrakenAdapter(KrakenCfg(), secrets, mode, client=client), mode


def approved(mode_switch, adapter_mode=Mode.TEST):
    rm = RiskManager(RiskConfig())
    req = OrderRequest("BTC/EUR", Side.BUY, 1.0, OrderType.LIMIT, limit_price=60000.0, post_only=True,
                       reference_price=60000.0)
    acct = AccountState(Broker.KRAKEN, adapter_mode, 1000, 1000)
    if adapter_mode == Mode.LIVE:
        rm.cfg(Broker.KRAKEN).live_capital_cap_eur = 1000
    return rm.approve(Broker.KRAKEN, req, acct, None).request


async def test_unapproved_order_is_refused_before_any_call():
    mock = KrakenMock()
    a, _ = make_adapter(mock)
    await a.connect()
    with pytest.raises(UnapprovedOrder):
        await a.place_order(OrderRequest("BTC/EUR", Side.BUY, 0.001, OrderType.LIMIT, limit_price=60000))
    assert not [c for c in mock.private_calls if c[0] == "AddOrder"]


async def test_test_mode_uses_paper_engine_and_validate_dry_run():
    mock = KrakenMock()
    a, mode = make_adapter(mock)
    await a.connect()
    req = approved(mode)
    order = await a.place_order(req)
    assert order.id.startswith("PKR-")  # paper order
    add = [b for m, b in mock.private_calls if m == "AddOrder"]
    assert add and all(b.get("validate") == "true" for b in add)  # never a real submission


async def test_live_order_has_post_only_and_stop_loss_close():
    mock = KrakenMock()
    a, mode = make_adapter(mock)
    await a.connect()
    mode.request_live(Broker.KRAKEN, confirm_phrase("kraken"), [Precondition("ok", True)])
    req = approved(mode, Mode.LIVE)
    order = await a.place_order(req)
    body = [b for m, b in mock.private_calls if m == "AddOrder"][-1]
    assert "validate" not in body and body["oflag"] == "post"
    assert body["close[ordertype]"] == "stop-loss" and float(body["close[price]"]) < 60000
    assert order.id == "OABC-123"


async def test_withdrawal_probe():
    a, _ = make_adapter(KrakenMock())
    assert await a.withdrawal_enabled() is False
    b, _ = make_adapter(KrakenMock(), keys=False)
    assert await b.withdrawal_enabled() is None
