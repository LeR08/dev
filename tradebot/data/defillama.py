"""Total stablecoin supply (DefiLlama, free, no key): the liquidity signal.

Supply growing over the window = fresh money entering crypto (favourable);
shrinking = money leaving (unfavourable). Uses the last *completed* day so the
signal never peeks at data published later.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from tradebot.data.cache import PoliteHttp

URL = "https://stablecoins.llama.fi/stablecoincharts/all"


def supply_change(series: list[tuple[datetime, float]], window_days: int, now: datetime) -> tuple[float, float] | None:
    """(% change over ``window_days`` ending yesterday, latest supply) or None."""
    today = now.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    past = [(d, v) for d, v in series if d < today]  # completed days only
    if len(past) <= window_days:
        return None
    end_d, end_v = past[-1]
    start = end_d - timedelta(days=window_days)
    start_v = next((v for d, v in reversed(past) if d <= start), None)
    if not start_v:
        return None
    return (end_v / start_v - 1) * 100, end_v


class StablecoinSupply:
    def __init__(self, http: PoliteHttp):
        self.http = http

    async def series(self) -> list[tuple[datetime, float]]:
        data = await self.http.get_json(URL, ttl=timedelta(hours=1))
        out = []
        for row in data:
            v = (row.get("totalCirculatingUSD") or {}).get("peggedUSD")
            if v:
                out.append((datetime.fromtimestamp(int(row["date"]), timezone.utc), float(v)))
        return sorted(out)

    async def change(self, window_days: int, now: datetime | None = None) -> tuple[float, float] | None:
        return supply_change(await self.series(), window_days, now or datetime.now(timezone.utc))
