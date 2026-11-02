"""Local SQLite cache + polite HTTP helper shared by the free data sources."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from tradebot.brokers.base import Bar
from tradebot.storage.db import Database

log = logging.getLogger(__name__)


class RateLimiter:
    """Minimum interval between calls (per source)."""

    def __init__(self, min_interval: float):
        self.min_interval = min_interval
        self._last = 0.0
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        async with self._lock:
            delay = self._last + self.min_interval - time.monotonic()
            if delay > 0:
                await asyncio.sleep(delay)
            self._last = time.monotonic()


class PoliteHttp:
    """GET with rate limiting, retries with backoff on 429/5xx, and a JSON cache with TTL."""

    def __init__(self, db: Database | None, source: str, min_interval: float, headers: dict | None = None,
                 client: httpx.AsyncClient | None = None, timeout: float = 20.0):
        self.db = db
        self.source = source
        self.limiter = RateLimiter(min_interval)
        self._client = client or httpx.AsyncClient(timeout=timeout, headers=headers or {}, follow_redirects=True)

    async def close(self) -> None:
        await self._client.aclose()

    async def get(self, url: str, params: dict | None = None, retries: int = 3) -> httpx.Response:
        backoff = 1.0
        for attempt in range(retries + 1):
            await self.limiter.wait()
            try:
                r = await self._client.get(url, params=params)
            except httpx.HTTPError as exc:
                if attempt == retries:
                    raise
                log.warning("%s GET failed (%s), retrying", self.source, type(exc).__name__)
            else:
                if r.status_code == 429 or r.status_code >= 500:
                    if attempt == retries:
                        r.raise_for_status()
                    log.warning("%s HTTP %s, backing off %.0fs", self.source, r.status_code, backoff)
                else:
                    r.raise_for_status()
                    return r
            await asyncio.sleep(backoff)
            backoff *= 2
        raise RuntimeError("unreachable")

    async def get_json(self, url: str, params: dict | None = None, ttl: timedelta | None = None,
                       cache_key: str | None = None) -> Any:
        key = cache_key or (url + "?" + "&".join(f"{k}={v}" for k, v in sorted((params or {}).items())
                                                  if "key" not in k.lower()))
        if ttl and self.db is not None:
            hit = self.db.cache_latest(self.source, "http", key)
            if hit and datetime.now(timezone.utc) - hit[2] < ttl:
                return hit[1]
        data = (await self.get(url, params)).json()
        if ttl and self.db is not None:
            self.db.cache_put_many(self.source, "http", key, [(datetime(1970, 1, 1, tzinfo=timezone.utc), data)])
        return data


# --------------------------------------------------------------------------- bars


def bars_to_rows(bars: list[Bar]) -> list[tuple[datetime, list]]:
    return [(b.ts, [b.open, b.high, b.low, b.close, b.volume]) for b in bars]


def rows_to_bars(rows) -> list[Bar]:
    return [Bar(ts, *map(float, p)) for ts, p in rows]


class BarCache:
    def __init__(self, db: Database):
        self.db = db

    @staticmethod
    def key(symbol: str, interval: str) -> str:
        return f"{symbol}|{interval}"

    def put(self, broker: str, symbol: str, interval: str, bars: list[Bar]) -> None:
        self.db.cache_put_many(broker, "ohlc", self.key(symbol, interval), bars_to_rows(bars))

    def get(self, broker: str, symbol: str, interval: str, since: datetime | None = None,
            until: datetime | None = None) -> list[Bar]:
        return rows_to_bars(self.db.cache_get(broker, "ohlc", self.key(symbol, interval), since, until))

    def symbols(self, broker: str, interval: str) -> list[str]:
        suffix = f"|{interval}"
        return sorted(k[: -len(suffix)] for k in self.db.cache_keys(broker, "ohlc") if k.endswith(suffix))
