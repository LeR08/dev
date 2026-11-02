"""SEC EDGAR (free): Form 4 insider transactions and 13F institutional holdings.

EDGAR requires a descriptive User-Agent ("name email") and at most 10 req/s;
requests go through :class:`PoliteHttp` with a configurable minimum interval.
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

from tradebot.agents.base import InsiderActivity, InsiderTxn
from tradebot.data.cache import PoliteHttp

log = logging.getLogger(__name__)

TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data/{cik}/{acc}/{doc}"
INDEX_URL = "https://www.sec.gov/Archives/edgar/data/{cik}/{acc}/index.json"


def _strip_ns(root: ET.Element) -> ET.Element:
    for el in root.iter():
        if isinstance(el.tag, str) and "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    return root


def _val(el: ET.Element | None, path: str) -> str | None:
    if el is None:
        return None
    node = el.find(path)
    if node is None:
        return None
    v = node.find("value")
    text = (v.text if v is not None else node.text) or ""
    return text.strip() or None


def parse_form4(xml_text: str) -> list[InsiderTxn]:
    """Open-market purchases (code P) and sales (code S) from a Form 4 XML."""
    root = _strip_ns(ET.fromstring(xml_text))
    owner = (root.findtext("reportingOwner/reportingOwnerId/rptOwnerName") or "unknown").strip()
    planned_doc = (root.findtext("aff10b5One") or "").strip().lower() in ("true", "1")
    out: list[InsiderTxn] = []
    for tx in root.iter("nonDerivativeTransaction"):
        code = (tx.findtext("transactionCoding/transactionCode") or "").strip()
        if code not in ("P", "S"):
            continue  # ignore grants, option exercises, gifts, tax withholding...
        shares = float(_val(tx, "transactionAmounts/transactionShares") or 0)
        price = float(_val(tx, "transactionAmounts/transactionPricePerShare") or 0)
        date_s = _val(tx, "transactionDate")
        if not date_s or shares <= 0:
            continue
        date = datetime.fromisoformat(date_s[:10]).replace(tzinfo=timezone.utc)
        out.append(InsiderTxn(date, owner, "buy" if code == "P" else "sell", shares, price,
                              planned=planned_doc and code == "S", source="sec"))
    return out


def parse_13f_infotable(xml_text: str) -> dict[str, float]:
    """CUSIP -> shares held, from a 13F information table."""
    root = _strip_ns(ET.fromstring(xml_text))
    out: dict[str, float] = {}
    for it in root.iter("infoTable"):
        cusip = (it.findtext("cusip") or "").strip().upper()
        amt = it.findtext("shrsOrPrnAmt/sshPrnamt")
        if cusip and amt:
            out[cusip] = out.get(cusip, 0.0) + float(amt)
    return out


class EdgarClient:
    def __init__(self, http: PoliteHttp):
        self.http = http
        self._cik: dict[str, int] | None = None

    async def cik_for_ticker(self, ticker: str) -> int | None:
        if self._cik is None:
            data = await self.http.get_json(TICKERS_URL, ttl=timedelta(days=7))
            self._cik = {v["ticker"].upper(): int(v["cik_str"]) for v in data.values()}
        return self._cik.get(ticker.upper())

    async def _recent_filings(self, cik: int, form: str, since: datetime) -> list[tuple[str, str, str]]:
        data = await self.http.get_json(SUBMISSIONS_URL.format(cik=cik), ttl=timedelta(hours=6))
        r = data.get("filings", {}).get("recent", {})
        out = []
        for acc, f, fdate, doc in zip(r.get("accessionNumber", []), r.get("form", []),
                                      r.get("filingDate", []), r.get("primaryDocument", [])):
            if f != form:
                continue
            if datetime.fromisoformat(fdate).replace(tzinfo=timezone.utc) < since:
                break  # filings are sorted newest first
            out.append((acc, fdate, doc))
        return out

    async def form4_transactions(self, ticker: str, since: datetime) -> list[InsiderTxn]:
        cik = await self.cik_for_ticker(ticker)
        if cik is None:
            return []
        txns: list[InsiderTxn] = []
        for acc, _, doc in await self._recent_filings(cik, "4", since):
            raw_doc = doc.split("/")[-1]  # "xslF345X06/form4.xml" -> raw XML "form4.xml"
            url = ARCHIVE_URL.format(cik=cik, acc=acc.replace("-", ""), doc=raw_doc)
            cache_key = f"form4:{acc}"
            hit = self.http.db.cache_latest("sec", "http", cache_key) if self.http.db else None
            if hit:
                text = hit[1]["xml"]
            else:
                try:
                    text = (await self.http.get(url)).text
                except Exception as exc:  # noqa: BLE001
                    log.warning("EDGAR form 4 fetch failed for %s: %s", ticker, type(exc).__name__)
                    continue
                if self.http.db:
                    self.http.db.cache_put_many("sec", "http", cache_key,
                                                [(datetime(1970, 1, 1, tzinfo=timezone.utc), {"xml": text})])
            try:
                txns.extend(t for t in parse_form4(text) if t.date >= since)
            except ET.ParseError:
                log.warning("EDGAR form 4 parse error %s", acc)
        return txns

    async def holdings_13f(self, filer_cik: int, last_n: int = 2) -> list[dict[str, float]]:
        """Most recent ``last_n`` 13F-HR holdings tables for one institution (newest first)."""
        since = datetime.now(timezone.utc) - timedelta(days=400)
        filings = (await self._recent_filings(filer_cik, "13F-HR", since))[:last_n]
        out = []
        for acc, _, _ in filings:
            acc_nd = acc.replace("-", "")
            idx = await self.http.get_json(INDEX_URL.format(cik=filer_cik, acc=acc_nd), ttl=timedelta(days=90))
            names = [i["name"] for i in idx.get("directory", {}).get("item", [])
                     if i["name"].lower().endswith(".xml") and "primary_doc" not in i["name"].lower()]
            if not names:
                continue
            text = (await self.http.get(ARCHIVE_URL.format(cik=filer_cik, acc=acc_nd, doc=names[0]))).text
            out.append(parse_13f_infotable(text))
        return out

    async def institutional_change_pct(self, cusip: str, filer_ciks: list[str]) -> float | None:
        prev_total = cur_total = 0.0
        for cik in filer_ciks:
            try:
                tables = await self.holdings_13f(int(cik))
            except Exception as exc:  # noqa: BLE001
                log.warning("13F fetch failed for %s: %s", cik, type(exc).__name__)
                continue
            if len(tables) == 2:
                cur_total += tables[0].get(cusip.upper(), 0.0)
                prev_total += tables[1].get(cusip.upper(), 0.0)
        if prev_total <= 0:
            return None
        return (cur_total - prev_total) / prev_total * 100

    async def activity(self, ticker: str, window_days: int, cusip: str | None = None,
                       institutions: list[str] | None = None, now: datetime | None = None) -> InsiderActivity:
        now = now or datetime.now(timezone.utc)
        txns = await self.form4_transactions(ticker, now - timedelta(days=window_days))
        inst = await self.institutional_change_pct(cusip, institutions) if cusip and institutions else None
        return InsiderActivity(window_days, tuple(txns), inst)
