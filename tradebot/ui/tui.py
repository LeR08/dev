"""Local terminal dashboard (Textual): panels on top, command line at the bottom.

Local only: no web server, no remote control port.
"""

from __future__ import annotations

from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, Footer, Input, RichLog, Static

from tradebot.brokers.base import Mode
from tradebot.logging_setup import UI_BUFFER
from tradebot.ui.commands import CommandProcessor


def badge(mode: Mode) -> str:
    return "[bold white on green] TEST [/]" if mode == Mode.TEST else "[bold white on red] LIVE [/]"


class TradebotApp(App):
    TITLE = "tradebot"
    CSS = """
    #header { height: 3; padding: 0 1; background: $panel; }
    #top { height: 1fr; }
    #positions { width: 3fr; border: round $primary; }
    #scan { width: 2fr; border: round $primary; padding: 0 1; }
    #votes { height: 12; border: round $primary; }
    #log { height: 12; border: round $secondary; }
    #output { height: auto; max-height: 14; border: round $accent; padding: 0 1; }
    #cmd { dock: bottom; }
    """
    BINDINGS = [("ctrl+q", "quit", "Quit"), ("ctrl+k", "kill", "Kill switch")]

    def __init__(self, bot):
        super().__init__()
        self.bot = bot
        self.proc = CommandProcessor(bot)
        self._log_seen = 0

    def compose(self) -> ComposeResult:
        yield Static(id="header")
        with Vertical():
            with Horizontal(id="top"):
                yield DataTable(id="positions", zebra_stripes=True)
                yield Static(id="scan", markup=False)
            yield DataTable(id="votes", zebra_stripes=True)
            yield RichLog(id="log", markup=False, wrap=True, max_lines=1000)
            yield Static("Type 'help' for commands.", id="output", markup=False)
        yield Input(placeholder="command (help, start all, status, kill, live on kraken ...)", id="cmd")
        yield Footer()

    def on_mount(self) -> None:
        pos = self.query_one("#positions", DataTable)
        pos.border_title = "Open positions"
        pos.add_columns("symbol", "broker", "mode", "size", "entry", "P&L", "take-profit", "stop", "flag")
        votes = self.query_one("#votes", DataTable)
        votes.border_title = "Agent votes (last decisions)"
        votes.add_columns("time", "broker", "symbol", "arbitrage", "convergence", "smart money", "consensus", "risk")
        self.query_one("#scan", Static).border_title = "Last scan"
        self.query_one("#log", RichLog).border_title = "Log"
        self.query_one("#cmd", Input).focus()
        self.refresh_panels()
        self.set_interval(2.0, self.refresh_panels)

    # ------------------------------------------------------------------ panels

    def refresh_panels(self) -> None:
        bot = self.bot
        parts = []
        for b, t in bot.traders.items():
            st = t.state
            conn = "[green]●[/]" if bot.adapters[b].connected else "[red]●[/]"
            parts.append(f"{b.value.upper()} {badge(t.mode)} {conn}  equity {st.equity:,.2f} EUR  "
                         f"day P&L {st.daily_pnl:+,.2f}  {'running' if t.running else 'stopped'}")
        self.query_one("#header", Static).update("\n".join(parts))

        pos = self.query_one("#positions", DataTable)
        pos.clear()
        for b, t in bot.traders.items():
            for p in bot.db.open_positions(b, t.mode):
                price = t.data._quotes.get(p.symbol)
                pnl = (price.bid - p.entry_price) * p.qty if price else None
                pos.add_row(p.symbol, b.value, p.mode.upper(), f"{p.qty:.6g}", f"{p.entry_price:.6g}",
                            "" if pnl is None else f"{pnl:+.2f}",
                            "" if p.take_profit_price is None else f"{p.take_profit_price:.6g}",
                            "" if p.stop_price is None else f"{p.stop_price:.6g}", t.state.flags.get(p.symbol, ""))

        lines = []
        for b, t in bot.traders.items():
            r = t.last_scan
            if r is None:
                lines.append(f"{b.value}: no scan yet")
                continue
            reasons = ", ".join(f"{k} {v}" for k, v in r.top_reasons(4)) or "-"
            lines.append(f"{b.value} {r.ts:%H:%M:%S}\n  scanned {r.scanned}  passed {len(r.passed)} "
                         f"({r.pass_rate:.0%})\n  rejected: {reasons}")
        self.query_one("#scan", Static).update("\n".join(lines))

        votes = self.query_one("#votes", DataTable)
        votes.clear()
        for d, vs in bot.db.last_decisions(10):
            by = {v.agent: v for v in vs}

            def fmt(name: str) -> str:
                v = by.get(name)
                return f"{v.direction} {v.confidence:.2f}" if v else ""

            votes.add_row(f"{d.ts:%H:%M:%S}", d.broker, d.symbol, fmt("arbitrage"), fmt("convergence"),
                          fmt("smart_money"), d.result.upper(), (d.risk_result or "")[:40])

        log = self.query_one("#log", RichLog)
        lines = list(UI_BUFFER.lines)
        new = lines[self._log_seen:] if self._log_seen <= len(lines) else lines
        for line in new:
            log.write(line)
        self._log_seen = len(lines)

    # ------------------------------------------------------------------ commands

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        line = event.value
        event.input.value = ""
        out_widget = self.query_one("#output", Static)
        if not line.strip() and not self.proc.awaiting_confirmation:
            return
        out_widget.update(f"> {line}\n…")
        self.run_worker(self._run_command(line), exclusive=False)

    async def _run_command(self, line: str) -> None:
        out = await self.proc.execute(line)
        if out == "__quit__":
            await self.action_quit()
            return
        cmd = self.query_one("#cmd", Input)
        cmd.placeholder = ("type the confirmation phrase (anything else cancels)"
                           if self.proc.awaiting_confirmation else "command")
        self.query_one("#output", Static).update(out or "ok")
        self.refresh_panels()

    async def action_kill(self) -> None:
        self.run_worker(self._run_command("kill"))

    async def action_quit(self) -> None:
        await self.bot.shutdown()
        self.exit()


def run_tui() -> int:
    from tradebot.app import Bot

    bot = Bot(console_log=False)
    TradebotApp(bot).run()
    return 0
