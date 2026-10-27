"""Test/live mode switch.

Rules (section 8 of the spec):
* every broker starts in TEST at every start (state is never restored from disk);
* only :meth:`ModeSwitch.request_live` can set LIVE, and only with all
  preconditions passing and the exact typed phrase;
* the bot may fall back to TEST on its own at any time, never the reverse.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Awaitable, Callable, Iterable

from tradebot.brokers.base import Broker, Mode, utcnow

log = logging.getLogger(__name__)

CONFIRM_PHRASE = "I ACCEPT REAL LOSSES ON {broker}"
MIN_PAPER_TRADES = 50
MIN_PAPER_DAYS = 14


def confirm_phrase(broker: Broker | str) -> str:
    return CONFIRM_PHRASE.format(broker=str(broker).upper())


@dataclass(frozen=True)
class Precondition:
    name: str
    ok: bool
    detail: str = ""


ModeListener = Callable[[Broker, Mode, str], None]


class ModeSwitch:
    def __init__(self, brokers: Iterable[Broker] = tuple(Broker), recorder=None,
                 clock: Callable[[], datetime] = utcnow):
        self._modes: dict[Broker, Mode] = {Broker(b): Mode.TEST for b in brokers}
        self._listeners: list[ModeListener] = []
        self._recorder = recorder  # callable(broker, new, previous, reason, actor)
        self._clock = clock
        for b in self._modes:
            self._record(b, Mode.TEST, None, "startup: test mode is always on at start", "system")

    # ------------------------------------------------------------------ read

    def mode(self, broker: Broker | str) -> Mode:
        return self._modes[Broker(broker)]

    def is_live(self, broker: Broker | str) -> bool:
        return self.mode(broker) == Mode.LIVE

    def snapshot(self) -> dict[str, str]:
        return {str(b): str(m) for b, m in self._modes.items()}

    def add_listener(self, fn: ModeListener) -> None:
        self._listeners.append(fn)

    # ------------------------------------------------------------------ write

    def request_live(self, broker: Broker | str, phrase: str,
                     preconditions: list[Precondition]) -> tuple[bool, str]:
        """The single code path that can turn test mode off."""
        broker = Broker(broker)
        if self._modes[broker] == Mode.LIVE:
            return True, f"{broker} is already LIVE"
        failed = [p for p in preconditions if not p.ok]
        if not preconditions:
            return False, "refused: preconditions were not evaluated"
        if failed:
            lines = "; ".join(f"{p.name}: {p.detail}" for p in failed)
            return False, f"refused: preconditions failed -> {lines}"
        expected = confirm_phrase(broker)
        if phrase.rstrip("\r\n") != expected:
            return False, f"refused: confirmation phrase must be exactly '{expected}'"
        self._set(broker, Mode.LIVE, "operator typed confirmation phrase", "operator")
        return True, f"{broker} is now LIVE — real money at risk"

    def set_test(self, broker: Broker | str, reason: str = "operator command", actor: str = "operator") -> None:
        """Immediate, no confirmation (live off / kill / automatic fallback)."""
        broker = Broker(broker)
        if self._modes[broker] != Mode.TEST:
            self._set(broker, Mode.TEST, reason, actor)

    def fallback_to_test(self, broker: Broker | str, reason: str) -> None:
        self.set_test(broker, f"automatic fallback: {reason}", "system")

    def all_to_test(self, reason: str, actor: str = "operator") -> None:
        for b in self._modes:
            self.set_test(b, reason, actor)

    def _set(self, broker: Broker, mode: Mode, reason: str, actor: str) -> None:
        previous = self._modes[broker]
        self._modes[broker] = mode
        level = logging.WARNING if mode == Mode.LIVE else logging.INFO
        log.log(level, "mode change %s -> %s (%s, by %s)", previous, mode, reason, actor,
                extra={"broker": str(broker), "mode": str(mode), "event": "mode_change"})
        self._record(broker, mode, previous, reason, actor)
        for fn in list(self._listeners):
            try:
                fn(broker, mode, reason)
            except Exception:
                log.exception("mode listener failed")

    def _record(self, broker: Broker, mode: Mode, previous: Mode | None, reason: str, actor: str) -> None:
        if self._recorder:
            try:
                self._recorder(broker, mode, previous, reason, actor)
            except Exception:
                log.exception("could not store mode change")


class LivePreconditions:
    """Evaluates the checks required before ``live on <broker>``."""

    def __init__(self, db, secrets, risk, clock: Callable[[], datetime] = utcnow,
                 withdrawal_probe: Callable[[], Awaitable[bool | None]] | None = None):
        self.db = db
        self.secrets = secrets
        self.risk = risk
        self.clock = clock
        self.withdrawal_probe = withdrawal_probe  # Kraken: True=withdraw enabled, False=disabled, None=unknown

    async def check(self, broker: Broker | str) -> list[Precondition]:
        broker = Broker(broker)
        out: list[Precondition] = []
        n = self.db.count_closed_positions(broker, Mode.TEST)
        out.append(Precondition("paper trades", n >= MIN_PAPER_TRADES, f"{n}/{MIN_PAPER_TRADES} closed paper trades"))
        first = self.db.first_activity(broker, Mode.TEST)
        days = (self.clock() - first).total_seconds() / 86400 if first else 0.0
        out.append(Precondition("paper duration", days >= MIN_PAPER_DAYS, f"{days:.1f}/{MIN_PAPER_DAYS} days in paper"))

        if broker == Broker.KRAKEN:
            has = self.secrets.has_kraken_keys
            out.append(Precondition("live API keys", has, "present" if has else "KRAKEN_API_KEY/SECRET missing in .env"))
            if has and self.withdrawal_probe is not None:
                try:
                    enabled = await self.withdrawal_probe()
                except Exception as exc:  # noqa: BLE001
                    enabled, _ = None, exc
                ok = enabled is False
                detail = {False: "withdrawals disabled", True: "key CAN withdraw — create a key without withdrawal",
                          None: "could not verify withdrawal permission"}[enabled]
                out.append(Precondition("withdrawals disabled", ok, detail))
            else:
                out.append(Precondition("withdrawals disabled", False, "cannot verify without API keys"))
        else:
            acct = self.secrets.ibkr_live_account
            out.append(Precondition("live account", bool(acct), "set" if acct else "IBKR_LIVE_ACCOUNT missing in .env"))

        ok, missing = self.risk.limits_set(broker)
        out.append(Precondition("risk limits set", ok, "all set" if ok else f"missing: {', '.join(missing)}"))
        halt = self.risk.halt_reason(broker)
        out.append(Precondition("no active risk halt", halt is None, halt or "none"))
        return out
