"""Structured JSON logging, rotated daily, with secret masking and a UI buffer."""

from __future__ import annotations

import json
import logging
import logging.handlers
import re
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

_mode_provider: Callable[[], dict[str, str]] | None = None

# Patterns masked even when the value is not a known secret.
_PATTERNS = [
    re.compile(r"(API-Key['\"]?\s*[:=]\s*['\"]?)[^'\"\s,}]+", re.I),
    re.compile(r"(API-Sign['\"]?\s*[:=]\s*['\"]?)[^'\"\s,}]+", re.I),
    re.compile(r"(apikey=)[^&\s]+", re.I),
    re.compile(r"(secret['\"]?\s*[:=]\s*['\"]?)[^'\"\s,}]+", re.I),
]


def set_mode_provider(fn: Callable[[], dict[str, str]] | None) -> None:
    """Register a callable returning {broker: mode}; added to every log line."""
    global _mode_provider
    _mode_provider = fn


class SecretMasker:
    def __init__(self, secrets: list[str] | None = None):
        self._secrets = [s for s in (secrets or []) if s and len(s) >= 4]

    def update(self, secrets: list[str]) -> None:
        self._secrets = [s for s in secrets if s and len(s) >= 4]

    def mask(self, text: str) -> str:
        for s in self._secrets:
            if s in text:
                text = text.replace(s, "***")
        for p in _PATTERNS:
            text = p.sub(r"\1***", text)
        return text


MASKER = SecretMasker()


class SecretMaskFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        record.msg = MASKER.mask(msg)
        record.args = None
        if record.exc_info and record.exc_info[1] is not None:
            record.exc_text = MASKER.mask(logging.Formatter().formatException(record.exc_info))
            record.exc_info = None
        return True


class JsonFormatter(logging.Formatter):
    EXTRA_KEYS = ("broker", "mode", "symbol", "event", "order_id")

    def format(self, record: logging.LogRecord) -> str:
        data: dict = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for k in self.EXTRA_KEYS:
            if hasattr(record, k):
                data[k] = getattr(record, k)
        if "mode" not in data:
            modes = _mode_provider() if _mode_provider else {}
            broker = data.get("broker")
            data["mode"] = modes.get(broker, "test") if broker else (modes or "test")
        if record.exc_text:
            data["exc"] = record.exc_text
        return MASKER.mask(json.dumps(data, default=str))


class UiBufferHandler(logging.Handler):
    """Keeps the last N formatted lines for the TUI log panel."""

    def __init__(self, maxlen: int = 500):
        super().__init__()
        self.lines: deque[str] = deque(maxlen=maxlen)

    def emit(self, record: logging.LogRecord) -> None:
        modes = _mode_provider() if _mode_provider else {}
        broker = getattr(record, "broker", None)
        mode = getattr(record, "mode", None) or (modes.get(broker) if broker else None)
        tag = f"[{broker}:{mode}]" if broker else ""
        ts = datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
        self.lines.append(MASKER.mask(f"{ts} {record.levelname:<7} {tag} {record.getMessage()}"))


UI_BUFFER = UiBufferHandler()


def setup_logging(log_dir: Path, secrets: list[str] | None = None, level: int = logging.INFO,
                  console: bool = False) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    MASKER.update(secrets or [])
    root = logging.getLogger()
    root.setLevel(level)
    for h in list(root.handlers):
        root.removeHandler(h)
    mask = SecretMaskFilter()

    fh = logging.handlers.TimedRotatingFileHandler(
        log_dir / "tradebot.jsonl", when="midnight", backupCount=30, encoding="utf-8", utc=True
    )
    fh.setFormatter(JsonFormatter())
    fh.addFilter(mask)
    root.addHandler(fh)

    UI_BUFFER.addFilter(mask)
    root.addHandler(UI_BUFFER)

    if console:
        ch = logging.StreamHandler()
        ch.setFormatter(JsonFormatter())
        ch.addFilter(mask)
        root.addHandler(ch)

    for noisy in ("httpx", "httpcore", "websockets", "ib_async", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def broker_logger(name: str, broker: str) -> logging.LoggerAdapter:
    return logging.LoggerAdapter(logging.getLogger(name), {"broker": broker})
