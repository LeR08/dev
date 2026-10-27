"""On-chain flows to/from labelled exchange wallets (free sources only).

* Ethereum / ERC-20: Etherscan API v2, free tier (key in .env).
* Bitcoin: mempool.space public API (no key).

Wallet ownership comes exclusively from ``config/wallet_labels.yaml``; the bot
never claims a wallet's owner beyond that list.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from tradebot.agents.base import OnchainFlow
from tradebot.data.cache import PoliteHttp
from tradebot.settings import WalletLabels

log = logging.getLogger(__name__)

ETHERSCAN = "https://api.etherscan.io/v2/api"
MEMPOOL = "https://mempool.space/api"


@dataclass(frozen=True)
class Transfer:
    ts: datetime
    amount: float  # asset units
    direction: str  # "in" (to exchange) / "out" (from exchange)
    wallet: str
    exchange: str
    txid: str


def summarize(asset: str, transfers: list[Transfer], price_eur: float, window_hours: int,
              min_tx_eur: float, now: datetime) -> OnchainFlow:
    since = now - timedelta(hours=window_hours)
    seen: set[tuple[str, str]] = set()
    inflow = outflow = 0.0
    n_in = n_out = 0
    for t in transfers:
        if t.ts < since or t.amount * price_eur < min_tx_eur:
            continue
        if (t.txid, t.direction) in seen:
            continue
        seen.add((t.txid, t.direction))
        if t.direction == "in":
            inflow += t.amount
            n_in += 1
        else:
            outflow += t.amount
            n_out += 1
    return OnchainFlow(asset=asset, inflow=inflow, outflow=outflow, window_hours=window_hours,
                       price_eur=price_eur, n_in=n_in, n_out=n_out)


class OnchainClient:
    def __init__(self, labels: WalletLabels, etherscan: PoliteHttp, mempool: PoliteHttp,
                 etherscan_key: str | None):
        self.labels = labels
        self.etherscan = etherscan
        self.mempool = mempool
        self.etherscan_key = etherscan_key

    def _exchange_set(self, chain: str) -> dict[str, str]:
        return {w.address.lower() if chain == "ethereum" else w.address: w.exchange
                for w in self.labels.addresses(chain)}

    # ------------------------------------------------------------------ ethereum

    async def _etherscan(self, params: dict) -> list[dict]:
        if not self.etherscan_key:
            return []
        q = {"chainid": 1, **params, "apikey": self.etherscan_key}
        data = await self.etherscan.get_json(ETHERSCAN, q, ttl=timedelta(minutes=5),
                                             cache_key="etherscan:" + "|".join(f"{k}={v}" for k, v in sorted(params.items())))
        if str(data.get("status")) != "1":
            msg = str(data.get("message", ""))
            if "No transactions" not in msg:
                log.warning("etherscan: %s", msg)
            return []
        return data.get("result") or []

    async def eth_transfers(self, token: tuple[str, int] | None = None) -> list[Transfer]:
        wallets = self._exchange_set("ethereum")
        out: list[Transfer] = []
        for addr, exch in wallets.items():
            params = {"module": "account", "address": addr, "page": 1, "offset": 200, "sort": "desc"}
            if token:
                params.update(action="tokentx", contractaddress=token[0])
                decimals = token[1]
            else:
                params["action"] = "txlist"
                decimals = 18
            for tx in await self._etherscan(params):
                frm, to = str(tx.get("from", "")).lower(), str(tx.get("to", "")).lower()
                if frm in wallets and to in wallets:
                    continue  # internal move between labelled wallets
                if str(tx.get("isError", "0")) == "1":
                    continue
                amount = int(tx.get("value", "0")) / 10**decimals
                if amount <= 0:
                    continue
                ts = datetime.fromtimestamp(int(tx["timeStamp"]), timezone.utc)
                direction = "in" if to == addr else "out"
                out.append(Transfer(ts, amount, direction, addr, exch, tx.get("hash", "")))
        return out

    # ------------------------------------------------------------------ bitcoin

    async def btc_transfers(self) -> list[Transfer]:
        wallets = self._exchange_set("bitcoin")
        out: list[Transfer] = []
        for addr, exch in wallets.items():
            try:
                txs = await self.mempool.get_json(f"{MEMPOOL}/address/{addr}/txs", ttl=timedelta(minutes=5))
            except Exception as exc:  # noqa: BLE001
                log.warning("mempool.space failed for %s…: %s", addr[:8], type(exc).__name__)
                continue
            for tx in txs or []:
                received = sum(v.get("value", 0) for v in tx.get("vout", []) if v.get("scriptpubkey_address") == addr)
                sent = sum((vin.get("prevout") or {}).get("value", 0) for vin in tx.get("vin", [])
                           if (vin.get("prevout") or {}).get("scriptpubkey_address") == addr)
                net = (received - sent) / 1e8
                if net == 0:
                    continue
                status = tx.get("status") or {}
                ts = datetime.fromtimestamp(status["block_time"], timezone.utc) if status.get("block_time") \
                    else datetime.now(timezone.utc)
                out.append(Transfer(ts, abs(net), "in" if net > 0 else "out", addr, exch, tx.get("txid", "")))
        return out

    # ------------------------------------------------------------------ summary

    async def flows(self, asset: str, price_eur: float, window_hours: int, min_tx_eur: float,
                    erc20: dict[str, tuple[str, int]], now: datetime | None = None) -> OnchainFlow | None:
        now = now or datetime.now(timezone.utc)
        if asset == "BTC":
            transfers = await self.btc_transfers()
        elif asset in ("ETH", *erc20) and not self.etherscan_key:
            return None  # no free Etherscan key configured -> no data, not "zero flows"
        elif asset == "ETH":
            transfers = await self.eth_transfers()
        elif asset in erc20:
            transfers = await self.eth_transfers(tuple(erc20[asset]))
        else:
            return None
        return summarize(asset, transfers, price_eur, window_hours, min_tx_eur, now)
