"""AMF BDIF (free public database): managers' transaction declarations (DD).

The BDIF API lists declarations per issuer (``jetons=<issuer id>``); the
transaction details are in the attached PDF, parsed here with pypdf.
Grants / performance shares / option exercises are ignored.
"""

from __future__ import annotations

import io
import logging
import re
from datetime import datetime, timedelta, timezone

from tradebot.agents.base import InsiderActivity, InsiderTxn
from tradebot.data.cache import PoliteHttp

log = logging.getLogger(__name__)

_NUM = r"([0-9][0-9\s.,]*)"


def _to_float(s: str) -> float:
    s = s.replace(" ", "").replace(" ", "")
    if "," in s and "." in s:
        s = s.replace(",", "")
    return float(s.replace(",", "."))


def parse_declaration_text(text: str, date: datetime) -> InsiderTxn | None:
    nature_m = re.search(r"NATURE DE LA TRANSACTION\s*:\s*(.+)", text)
    if not nature_m:
        return None
    nature = nature_m.group(1).strip().lower()
    linked = re.search(r"ACTIONS GRATUITES OU DE PERFORMANCES?\s*:\s*OUI", text, re.I)
    if linked or any(w in nature for w in ("performance", "gratuite", "exercice", "attribution", "donation", "nantissement")):
        return None
    if nature.startswith("acquisition") or nature.startswith("souscription"):
        side = "buy"
    elif nature.startswith("cession"):
        side = "sell"
    else:
        return None
    price_m = re.search(r"INFORMATIONS AGREGEES\s*PRIX\s*:\s*" + _NUM, text) or re.search(r"PRIX UNITAIRE\s*:\s*" + _NUM, text)
    vol_m = re.search(r"INFORMATIONS AGREGEES.*?VOLUME\s*:\s*" + _NUM, text, re.S) or re.search(r"VOLUME\s*:\s*" + _NUM, text)
    if not price_m or not vol_m:
        return None
    price, volume = _to_float(price_m.group(1)), _to_float(vol_m.group(1))
    if price <= 0 or volume <= 0:
        return None
    who_m = re.search(r"PERSONNE ETROITEMENT LIEE\s*:\s*\n?(.+)", text)
    who = who_m.group(1).strip().split(",")[0] if who_m else "unknown"
    return InsiderTxn(date, who, side, volume, price, planned=False, source="amf")


class AmfClient:
    def __init__(self, http: PoliteHttp, api: str = "https://bdif.amf-france.org/back/api/v1"):
        self.http = http
        self.api = api.rstrip("/")

    async def declarations(self, jeton: str, since: datetime, max_items: int = 50) -> list[InsiderTxn]:
        data = await self.http.get_json(f"{self.api}/informations",
                                        {"typesInformation": "DD", "jetons": jeton, "size": max_items, "from": 0},
                                        ttl=timedelta(hours=3))
        out: list[InsiderTxn] = []
        for item in data.get("result", []):
            date = datetime.fromisoformat(item["dateInformation"][:19]).replace(tzinfo=timezone.utc)
            if date < since:
                continue
            for doc in item.get("documents", []):
                path = doc.get("path")
                if not path or not path.lower().endswith(".pdf"):
                    continue
                txn = await self._parse_pdf(item.get("numero", path), path, date)
                if txn:
                    out.append(txn)
        return out

    async def _parse_pdf(self, numero: str, path: str, date: datetime) -> InsiderTxn | None:
        key = f"amf:{numero}"
        hit = self.http.db.cache_latest("amf", "http", key) if self.http.db else None
        if hit:
            text = hit[1]["text"]
        else:
            try:
                from pypdf import PdfReader

                raw = (await self.http.get(f"{self.api}/documents/{path}")).content
                text = "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(raw)).pages)
            except Exception as exc:  # noqa: BLE001
                log.warning("AMF declaration %s unreadable: %s", numero, type(exc).__name__)
                return None
            if self.http.db:
                self.http.db.cache_put_many("amf", "http", key, [(datetime(1970, 1, 1, tzinfo=timezone.utc), {"text": text})])
        return parse_declaration_text(text, date)

    async def activity(self, jeton: str, window_days: int, now: datetime | None = None) -> InsiderActivity:
        now = now or datetime.now(timezone.utc)
        txns = await self.declarations(jeton, now - timedelta(days=window_days))
        return InsiderActivity(window_days, tuple(txns))
