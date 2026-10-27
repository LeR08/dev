"""Acceptance: test mode at every start; only `live on` + exact phrase can go live."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

from tradebot.brokers.base import Broker, Mode
from tradebot.engine.mode import ModeSwitch, Precondition, confirm_phrase
from tradebot.ui.commands import CommandProcessor

PKG = Path(__file__).resolve().parents[1]
OK = [Precondition("x", True)]


def test_every_broker_starts_in_test_mode():
    m = ModeSwitch()
    assert all(m.mode(b) == Mode.TEST for b in Broker)


def test_bot_start_puts_both_brokers_in_test(make_bot):
    bot = make_bot()
    assert bot.mode.snapshot() == {"kraken": "test", "ibkr": "test"}
    changes = bot.db.mode_changes()
    assert {c.broker for c in changes} == {"kraken", "ibkr"}
    assert all(c.mode == "test" for c in changes)


def test_restart_resets_to_test(make_bot):
    bot = make_bot()
    bot.mode._set(Broker.KRAKEN, Mode.LIVE, "simulated", "test")  # pretend we were live
    bot2 = make_bot()  # restart against the same database
    assert bot2.mode.mode(Broker.KRAKEN) == Mode.TEST


@pytest.mark.parametrize("phrase", ["", "i accept real losses on kraken", "I ACCEPT REAL LOSSES ON IBKR",
                                    "I ACCEPT REAL LOSSES ON KRAKEN!", "yes"])
def test_wrong_phrase_refused(phrase):
    m = ModeSwitch()
    ok, msg = m.request_live(Broker.KRAKEN, phrase, OK)
    assert not ok and m.mode(Broker.KRAKEN) == Mode.TEST


def test_failed_or_missing_preconditions_refused():
    m = ModeSwitch()
    ok, _ = m.request_live(Broker.KRAKEN, confirm_phrase("kraken"), [Precondition("trades", False, "3/50")])
    assert not ok
    ok, _ = m.request_live(Broker.KRAKEN, confirm_phrase("kraken"), [])
    assert not ok
    assert m.mode(Broker.KRAKEN) == Mode.TEST


def test_exact_phrase_with_preconditions_goes_live_and_is_logged():
    rec = []
    m = ModeSwitch(recorder=lambda *a: rec.append(a))
    ok, _ = m.request_live(Broker.IBKR, "I ACCEPT REAL LOSSES ON IBKR", OK)
    assert ok and m.mode(Broker.IBKR) == Mode.LIVE and m.mode(Broker.KRAKEN) == Mode.TEST
    assert rec[-1][0] == Broker.IBKR and rec[-1][1] == Mode.LIVE


def test_fallback_and_live_off_are_immediate():
    m = ModeSwitch()
    m.request_live(Broker.KRAKEN, confirm_phrase("kraken"), OK)
    m.fallback_to_test(Broker.KRAKEN, "daily loss")
    assert m.mode(Broker.KRAKEN) == Mode.TEST
    m.request_live(Broker.KRAKEN, confirm_phrase("kraken"), OK)
    m.set_test(Broker.KRAKEN)
    assert m.mode(Broker.KRAKEN) == Mode.TEST


async def test_live_on_command_refuses_without_paper_history(make_bot):
    bot = make_bot()
    proc = CommandProcessor(bot)
    out = await proc.execute("live on kraken")
    assert "REFUSED" in out and "0/50 closed paper trades" in out
    assert not proc.awaiting_confirmation
    assert bot.mode.mode(Broker.KRAKEN) == Mode.TEST


async def test_live_on_command_two_step_confirmation(make_bot, monkeypatch):
    bot = make_bot()
    proc = CommandProcessor(bot)

    async def all_ok(broker):
        return [Precondition("all", True, "ok")]

    monkeypatch.setattr(bot.preconditions, "check", all_ok)
    out = await proc.execute("live on kraken")
    assert "I ACCEPT REAL LOSSES ON KRAKEN" in out and proc.awaiting_confirmation
    out = await proc.execute("status")  # anything else cancels
    assert bot.mode.mode(Broker.KRAKEN) == Mode.TEST and "refused" in out
    await proc.execute("live on kraken")
    out = await proc.execute("I ACCEPT REAL LOSSES ON KRAKEN")
    assert bot.mode.mode(Broker.KRAKEN) == Mode.LIVE, out
    await proc.execute("live off kraken")
    assert bot.mode.mode(Broker.KRAKEN) == Mode.TEST


def _calls(tree: ast.AST, name: str):
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            f = node.func
            fname = f.attr if isinstance(f, ast.Attribute) else getattr(f, "id", None)
            if fname == name:
                yield node


def test_no_code_path_goes_live_except_request_live():
    """Static check over the whole package (tests excluded)."""
    offenders = []
    for path in PKG.rglob("*.py"):
        if "tests" in path.parts:
            continue
        tree = ast.parse(path.read_text())
        rel = path.relative_to(PKG).as_posix()
        # 1) `Mode.LIVE` may only be *passed to _set* inside ModeSwitch.request_live
        for call in _calls(tree, "_set"):
            if any(isinstance(a, ast.Attribute) and a.attr == "LIVE" for a in call.args):
                func = next((n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)
                             and n.lineno <= call.lineno <= n.end_lineno and n.name == "request_live"), None)
                if not (rel == "engine/mode.py" and func):
                    offenders.append(f"{rel}:{call.lineno} sets LIVE")
        # 2) request_live is only called from Bot.go_live (the `live on` confirmation)
        for call in _calls(tree, "request_live"):
            if rel != "app.py":
                offenders.append(f"{rel}:{call.lineno} calls request_live")
        # 3) nothing writes the internal mode table directly
        for node in ast.walk(tree):
            if isinstance(node, ast.Subscript) and isinstance(node.ctx, ast.Store) and \
                    isinstance(node.value, ast.Attribute) and node.value.attr == "_modes":
                if rel != "engine/mode.py":
                    offenders.append(f"{rel}:{node.lineno} writes _modes")
    assert not offenders, offenders
    app = (PKG / "app.py").read_text()
    assert "request_live(broker, phrase, pre)" in app
    # the only caller of go_live is the confirmation step of `live on`
    callers = [p for p in PKG.rglob("*.py") if "tests" not in p.parts and "go_live(" in p.read_text()]
    assert sorted(p.relative_to(PKG).as_posix() for p in callers) == ["app.py", "ui/commands.py"]
