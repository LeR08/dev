"""On-chain exchange flows from balance snapshots (free sources only).

The bot periodically records the balance of every labelled exchange wallet
(``config/wallet_labels.yaml``) and derives the net flow over a window from the
change in total balance. This is exact and needs one call per wallet, unlike
transaction lists, which only return the last 50-200 transactions and cover a
few minutes for busy exchange wallets.

* Ethereum, ERC-20 tokens and stablecoins: Etherscan API v2, free tier (key in .env).
* Bitcoin: mempool.space public API (no key).

Wallet ownership comes exclusively from ``wallet_labels.yaml``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from tradebot.agents.base import OnchainFlow
from tradebot.data.cache import PoliteHttp
from tradebot.settings import WalletLabels

log = logging.getLogger(__name__)

ETHERSCAN = "https://api.etherscan.io/v2/api"
MEMPOOL = "https://mempool.space/api"
KIND = "exch_balance"
STABLES = {"USDT": ("0xdac17f958d2ee523a2206206994597c13d831ec7", 6),
           "USDC": ("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6)}


def netflow_from_snapshots(rows: list[tuple[datetime, dict]], window: timedelta,
                           now: datetime) -> tuple[float, float, float] | None:
    """(net change, total balance now, hours covered) from stored snapshots, or None.

    Compares only wallets present in both snapshots, so editing the label list never
    shows up as a flow.
    """
    if len(rows) < 2:
        return None
    latest_ts, latest = rows[-1]
    target = now - window
    older = [r for r in rows if r[0] <= target]
    past_ts, past = older[-1] if older else rows[0]
    span = (latest_ts - past_ts).total_seconds() / 3600
    if span < window.total_seconds() / 3600 * 0.5:
        return None  # not enough history yet (needs half the window at least)
    common = set(latest["wallets"]) & set(past["wallets"])
    if not common:
        return None
    net = sum(latest["wallets"][w] - past["wallets"][w] for w in common)
    total = sum(latest["wallets"][w] for w in common)
    return net, total, span


class OnchainClient:
    def __init__(self, labels: WalletLabels, etherscan: PoliteHttp, mempool: PoliteHttp,
                 etherscan_key: str | None, db=None, snapshot_minutes: float = 30):
        self.labels = labels
        self.etherscan = etherscan
        self.mempool = mempool
        self.etherscan_key = etherscan_key
        self.db = db if db is not None else etherscan.db
        self.snapshot_minutes = snapshot_minutes

    # ------------------------------------------------------------------ balances

    async def _etherscan(self, params: dict):
        q = {"chainid": 1, **params, "apikey": self.etherscan_key}
        data = await self.etherscan.get_json(ETHERSCAN, q)
        if str(data.get("status")) != "1":
            raise RuntimeError(f"etherscan: {data.get('message')} {str(data.get('result'))[:80]}")
        return data["result"]

    async def _eth_balances(self, addrs: list[str]) -> dict[str, float]:
        out: dict[str, float] = {}
        for i in range(0, len(addrs), 20):  # balancemulti: up to 20 addresses per call
            res = await self._etherscan({"module": "account", "action": "balancemulti",
                                         "address": ",".join(addrs[i:i + 20]), "tag": "latest"})
            for r in res:
                out[r["account"].lower()] = int(r["balance"]) / 1e18
        return out

    async def _token_balances(self, addrs: list[str], contract: str, decimals: int) -> dict[str, float]:
        out = {}
        for a in addrs:
            res = await self._etherscan({"module": "account", "action": "tokenbalance", "contractaddress": contract,
                                         "address": a, "tag": "latest"})
            out[a] = int(res) / 10**decimals
        return out

    async def _btc_balances(self, addrs: list[str]) -> dict[str, float]:
        out = {}
        for a in addrs:
            d = await self.mempool.get_json(f"{MEMPOOL}/address/{a}")
            cs, ms = d.get("chain_stats", {}), d.get("mempool_stats", {})
            sats = cs.get("funded_txo_sum", 0) - cs.get("spent_txo_sum", 0) + \
                ms.get("funded_txo_sum", 0) - ms.get("spent_txo_sum", 0)
            out[a] = sats / 1e8
        return out

    def tracked_assets(self, erc20: dict[str, tuple[str, int]]) -> list[str]:
        assets = []
        if self.labels.addresses("bitcoin"):
            assets.append("BTC")
        if self.labels.addresses("ethereum") and self.etherscan_key:
            assets += ["ETH", *STABLES, *erc20]
        return assets

    async def snapshot(self, asset: str, erc20: dict[str, tuple[str, int]], now: datetime | None = None) -> bool:
        """Record exchange balances for ``asset`` (at most once per ``snapshot_minutes``)."""
        now = now or datetime.now(timezone.utc)
        last = self.db.cache_latest("onchain", KIND, asset)
        if last and now - last[0] < timedelta(minutes=self.snapshot_minutes):
            return False
        try:
            if asset == "BTC":
                addrs = [w.address for w in self.labels.addresses("bitcoin")]
                wallets = await self._btc_balances(addrs)
            else:
                if not self.etherscan_key:
                    return False
                addrs = [w.address.lower() for w in self.labels.addresses("ethereum")]
                if asset == "ETH":
                    wallets = await self._eth_balances(addrs)
                else:
                    contract, decimals = STABLES.get(asset) or tuple(erc20[asset])
                    wallets = await self._token_balances(addrs, contract, int(decimals))
        except Exception as exc:  # noqa: BLE001  a partial snapshot would fake a flow: skip it
            log.warning("on-chain snapshot %s failed: %s", asset, exc)
            return False
        self.db.cache_put_many("onchain", KIND, asset, [(now, {"wallets": wallets, "total": sum(wallets.values())})])
        return True

    async def snapshot_all(self, erc20: dict[str, tuple[str, int]], now: datetime | None = None) -> int:
        n = 0
        for asset in self.tracked_assets(erc20):
            n += await self.snapshot(asset, erc20, now)
        return n

    # ------------------------------------------------------------------ flows

    def flow(self, asset: str, price_eur: float, window_hours: int, now: datetime | None = None) -> OnchainFlow | None:
        now = now or datetime.now(timezone.utc)
        window = timedelta(hours=window_hours)
        rows = self.db.cache_get("onchain", KIND, asset, since=now - window * 2)
        res = netflow_from_snapshots(rows, window, now)
        if res is None:
            return None
        net, total, span = res
        return OnchainFlow(asset=asset, inflow=max(net, 0.0), outflow=max(-net, 0.0), window_hours=round(span),
                           price_eur=price_eur, exchange_balance=total)

    async def flows(self, asset: str, price_eur: float, window_hours: int, erc20: dict[str, tuple[str, int]],
                    now: datetime | None = None) -> OnchainFlow | None:
        if asset not in self.tracked_assets(erc20):
            return None
        await self.snapshot(asset, erc20, now)
        return self.flow(asset, price_eur, window_hours, now)

    async def stablecoin_flow(self, usd_to_eur: float, window_hours: int,
                              now: datetime | None = None) -> OnchainFlow | None:
        """USDT + USDC exchange balance change: stablecoins arriving on exchanges = buying power."""
        flows = []
        for s in STABLES:
            if s in self.tracked_assets({}):
                await self.snapshot(s, {}, now)
                f = self.flow(s, usd_to_eur, window_hours, now)
                if f:
                    flows.append(f)
        if not flows:
            return None
        return OnchainFlow("STABLES", sum(f.inflow for f in flows), sum(f.outflow for f in flows),
                           min(f.window_hours for f in flows), usd_to_eur,
                           exchange_balance=sum(f.exchange_balance or 0 for f in flows))
