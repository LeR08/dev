"""Kraken public market data (OHLC history) with local caching.

Kraken's OHLC endpoint only returns the most recent 720 bars per interval;
the local cache keeps growing while the bot runs, so backtests get longer
history over time without re-downloading.
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from tradebot.brokers.base import Bar
from tradebot.data.cache import BarCache, RateLimiter

KRAKEN_API = "https://api.kraken.com"
VALID_INTERVALS = (1, 5, 15, 30, 60, 240, 1440, 10080, 21600)


def parse_ohlc(rows: list[list]) -> list[Bar]:
    out = []
    for r in rows:
        ts = datetime.fromtimestamp(int(r[0]), timezone.utc)
        out.append(Bar(ts, float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[6])))
    return out


class KrakenFeed:
    def __init__(self, cache: BarCache | None, client: httpx.AsyncClient | None = None):
        self.cache = cache
        self._client = client or httpx.AsyncClient(base_url=KRAKEN_API, timeout=20)
        self._limiter = RateLimiter(1.0)  # public endpoints: ~1 req/s

    async def close(self) -> None:
        await self._client.aclose()

    async def fetch_ohlc(self, pair: str, interval: int, since: datetime | None = None) -> list[Bar]:
        if interval not in VALID_INTERVALS:
            raise ValueError(f"interval must be one of {VALID_INTERVALS}")
        params: dict = {"pair": pair, "interval": interval}
        if since:
            params["since"] = int(since.timestamp())
        await self._limiter.wait()
        r = await self._client.get("/0/public/OHLC", params=params)
        r.raise_for_status()
        data = r.json()
        if data.get("error"):
            raise RuntimeError(f"Kraken OHLC error: {data['error']}")
        result = {k: v for k, v in data["result"].items() if k != "last"}
        rows = next(iter(result.values()), [])
        bars = parse_ohlc(rows)
        # the last bar is still forming: keep it out of the cache
        return bars

    async def bars(self, symbol: str, pair: str, interval: int, limit: int = 200) -> list[Bar]:
        """Fetch fresh bars, merge into the cache, return the last ``limit`` closed bars."""
        key_interval = f"{interval}m"
        cached = self.cache.get("kraken", symbol, key_interval) if self.cache else []
        since = cached[-1].ts if cached else None
        fresh = await self.fetch_ohlc(pair, interval, since)
        closed = fresh[:-1] if fresh else []
        if self.cache and closed:
            self.cache.put("kraken", symbol, key_interval, closed)
            cached = self.cache.get("kraken", symbol, key_interval)
        else:
            merged = {b.ts: b for b in cached + closed}
            cached = [merged[t] for t in sorted(merged)]
        return cached[-limit:]
