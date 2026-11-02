"""Plain CLI: ``bot <command>`` for scripting/headless use, ``bot`` / ``bot tui`` for the dashboard.

* ``bot run [broker]``  – headless: start loops and read commands from stdin.
* ``bot <command>``     – one-shot command (scan, votes, report, backtest, kill...).
"""

from __future__ import annotations

import asyncio
import sys

from tradebot.ui.commands import HELP, CommandProcessor


async def _one_shot(argv: list[str]) -> int:
    from tradebot.app import Bot

    bot = Bot(console_log=False)
    proc = CommandProcessor(bot)
    try:
        out = await proc.execute(" ".join(_quote(a) for a in argv))
        print(out)
        if proc.awaiting_confirmation:
            phrase = await asyncio.to_thread(input, "> ")
            print(await proc.execute(phrase))
            if any(t.mode.value == "live" for t in bot.traders.values()):
                print("LIVE mode only lasts for this process. Use `bot run` to trade.")
        return 0
    finally:
        await bot.shutdown()


async def _headless(argv: list[str]) -> int:
    from tradebot.app import Bot

    bot = Bot(console_log=False)
    proc = CommandProcessor(bot)
    print("tradebot headless — both brokers start in TEST mode. Type 'help'.")
    try:
        print(await proc.execute("start " + (argv[0] if argv else "all")))
        while True:
            prompt = "confirm> " if proc.awaiting_confirmation else "bot> "
            try:
                line = await asyncio.to_thread(input, prompt)
            except EOFError:
                break
            out = await proc.execute(line)
            if out == "__quit__":
                break
            if out:
                print(out)
    finally:
        await bot.shutdown()
    return 0


def _quote(a: str) -> str:
    return f'"{a}"' if " " in a else a


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv or argv[0] == "tui":
        from tradebot.ui.tui import run_tui

        return run_tui()
    if argv[0] in ("-h", "--help", "help"):
        print(HELP + "\n\n  bot            dashboard (Textual TUI)\n  bot run [broker]  headless loop with a prompt")
        return 0
    if argv[0] == "run":
        return asyncio.run(_headless(argv[1:]))
    return asyncio.run(_one_shot(argv))


if __name__ == "__main__":
    raise SystemExit(main())
