"""Local terminal dashboard (Textual).

Layout: header (mode badges, equity, P&L) / Analyse (last scan + agent votes) /
Positions en cours (live P&L) / Positions terminées (realised P&L) / log / command line.
Local only: no web server, no remote control port.
"""

from __future__ import annotations

from rich.markup import escape
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, Footer, Input, RichLog, Static

from tradebot.brokers.base import Mode
from tradebot.logging_setup import UI_BUFFER
from tradebot.storage.db import as_utc
from tradebot.ui.commands import CommandProcessor


# Tokyo Night palette: soft on dark backgrounds, readable in Windows Terminal and cmd.exe
GREEN, RED, PURPLE, BLUE, CYAN, ORANGE, GREY, FG = ("#9ece6a", "#f7768e", "#bb9af7", "#7aa2f7", "#7dcfff",
                                                     "#ff9e64", "#565f89", "#c0caf5")
THEME = "tokyo-night"


def badge(mode: Mode) -> str:
    return f"[bold #1a1b26 on {GREEN}] FICTIF [/]" if mode == Mode.TEST else f"[bold #1a1b26 on {RED}] RÉEL [/]"


def side_markup(side: str) -> str:
    return f"[{GREEN}]LONG[/]" if side != "short" else f"[{PURPLE}]SHORT[/]"


def pnl_markup(value: float | None, suffix: str = " €") -> str:
    if value is None:
        return ""
    color = GREEN if value > 0 else RED if value < 0 else FG
    return f"[{color}]{value:+,.2f}{suffix}[/]"


def change_markup(value: float | None) -> str:
    if value is None:
        return f"[{GREY}]—[/]"
    color = GREEN if value > 0 else RED if value < 0 else FG
    arrow = "▲" if value > 0 else "▼" if value < 0 else "•"
    return f"[{color}]{arrow} {value:+.2f} %[/]"


def status_markup(text: str) -> str:
    out = escape(text)
    out = out.replace("DÉFAVORABLE", f"[bold {RED}]DÉFAVORABLE[/]")
    out = out.replace("→ FAVORABLE", f"→ [bold {GREEN}]FAVORABLE[/]")
    for word, color in (("cible LONG", GREEN), ("cible SHORT", PURPLE), ("cible CASH", GREY)):
        out = out.replace(word, f"[bold {color}]{word}[/]")
    return out.replace(" | ", "\n ")


class TradebotApp(App):
    TITLE = "tradebot"
    CSS = """
    Screen { background: $background; }
    #header { height: 3; padding: 0 1; background: $boost; color: $foreground; }
    #body { height: 1fr; }
    #analyse { height: 2fr; min-height: 7; border: round $primary; border-title-color: $primary; }
    #scan { width: 1fr; height: 100%; padding: 0 1; border-right: solid $primary-darken-3; }
    #votes { width: 2fr; height: 100%; }
    #positions-row { height: 2fr; min-height: 7; }
    #open { width: 1fr; height: 100%; border: round $success; border-title-color: $success; }
    #closed { width: 1fr; height: 100%; border: round $warning; border-title-color: $warning; }
    #log { height: 1fr; min-height: 4; border: round $secondary; border-title-color: $secondary; }
    #output { height: auto; min-height: 3; max-height: 10; border: round $accent; padding: 0 1; }
    #cmd { dock: bottom; }
    DataTable > .datatable--header { background: $boost; color: $primary; text-style: bold; }
    DataTable > .datatable--even-row { background: $surface; }
    """
    BINDINGS = [("ctrl+q", "quit", "Quitter"), ("ctrl+k", "kill", "Kill switch")]

    def __init__(self, bot):
        super().__init__()
        self.bot = bot
        self.proc = CommandProcessor(bot)
        self._log_seen = 0

    def compose(self) -> ComposeResult:
        yield Static(id="header")
        with Vertical(id="body"):
            with Horizontal(id="analyse"):
                yield Static(id="scan")
                yield DataTable(id="votes", zebra_stripes=True, cursor_type="none")
            with Horizontal(id="positions-row"):
                yield DataTable(id="open", zebra_stripes=True, cursor_type="none")
                yield DataTable(id="closed", zebra_stripes=True, cursor_type="none")
            yield RichLog(id="log", markup=False, wrap=True, max_lines=1000)
            yield Static("Tapez 'help' pour la liste des commandes. Ex : start kraken", id="output", markup=False)
        yield Input(placeholder="commande (help, start kraken, status, kill, live on kraken ...)", id="cmd")
        yield Footer()

    @property
    def market_mode(self) -> bool:
        return any(hasattr(t, "overview") for t in self.bot.traders.values())

    def on_mount(self) -> None:
        self.theme = THEME
        self.query_one("#analyse").border_title = "Analyse"
        votes = self.query_one("#votes", DataTable)
        if self.market_mode:
            votes.add_columns("crypto", "prix $", "1 h", "24 h", "7 jours", "30 jours", "rôle")
        else:
            votes.add_columns("heure", "broker", "symbole", "arbitrage", "convergence", "smart money", "tendance",
                              "décision", "risque")
        opened = self.query_one("#open", DataTable)
        opened.border_title = "Positions en cours"
        opened.add_columns("symbole", "broker", "sens", "levier", "taille", "entrée", "prix", "P&L €", "P&L %",
                           "objectif", "stop", "alerte")
        closed = self.query_one("#closed", DataTable)
        closed.border_title = "Positions terminées"
        closed.add_columns("symbole", "broker", "sens", "levier", "entrée", "sortie", "P&L €", "P&L %", "raison", "fermée")
        self.query_one("#log", RichLog).border_title = "Journal"
        self.query_one("#cmd", Input).focus()
        self.refresh_panels()
        self.set_interval(2.0, self.refresh_panels)

    # ------------------------------------------------------------------ panels

    def refresh_panels(self) -> None:
        bot = self.bot
        open_rows, unrealized = self._open_rows()
        closed_rows, realized, n_closed, wins = self._closed_rows()

        parts = []
        for b, t in bot.traders.items():
            st = t.state
            conn = f"[{GREEN}]●[/]" if bot.adapters[b].connected else f"[{RED}]●[/]"
            run = f"[{GREEN}]en marche[/]" if t.running else f"[{GREY}]arrêté[/]"
            parts.append(f"[bold {BLUE}]{b.value.upper():<6}[/] {badge(t.mode)} {conn}  capital "
                         f"[bold]{st.equity:,.2f} €[/]  jour {pnl_markup(st.daily_pnl)}  {run}")
        self.query_one("#header", Static).update("\n".join(parts))

        # Analyse
        lines = []
        for b, t in bot.traders.items():
            if hasattr(t, "status"):  # liquidity mode: no scan, one signal
                nxt = f" · maj {t.next_cycle_at.astimezone():%H:%M:%S}" if t.running and t.next_cycle_at else ""
                lines.append(f"[bold {BLUE}]{b.value}[/]{nxt}\n {status_markup(t.status)}")
                continue
            r = t.last_scan
            if r is None:
                lines.append(f"{b.value}: pas encore de scan")
                continue
            reasons = ", ".join(f"{k} {v}" for k, v in r.top_reasons(3)) or "-"
            nxt = f", prochain scan {t.next_cycle_at.astimezone():%H:%M}" if t.running and t.next_cycle_at else ""
            lines.append(f"[bold {BLUE}]{b.value}[/] {r.ts.astimezone():%H:%M:%S}{nxt}\n {r.scanned} analysés, "
                         f"{len(r.passed)} retenus ({r.pass_rate:.0%})\n rejets: {escape(reasons)}")
        self.query_one("#scan", Static).update("\n".join(lines))
        votes = self.query_one("#votes", DataTable)
        votes.clear()
        if self.market_mode:
            for t in bot.traders.values():
                for v in getattr(t, "overview", []):
                    role = v.role
                    if role:
                        color = PURPLE if "SHORT" in role else GREEN
                        role = f"[bold {color}]{role}[/]"
                    price = "" if v.price is None else f"{v.price:,.6g}"
                    votes.add_row(f"[bold {CYAN}]{v.symbol.split('/')[0]}[/]", price, change_markup(v.ch_1h),
                                  change_markup(v.ch_24h), change_markup(v.ch_7d), change_markup(v.ch_30d), role)
            votes.border_subtitle = "variations mises à jour à chaque cycle (60 s)"
            decisions = []
        else:
            decisions = bot.db.last_decisions(15)
        for d, vs in decisions:
            by = {v.agent: v for v in vs}

            def fmt(name: str) -> str:
                v = by.get(name)
                if not v:
                    return ""
                color = {"LONG": GREEN, "SHORT": PURPLE, "AVOID": RED}.get(str(v.direction), GREY)
                return f"[{color}]{v.direction} {v.confidence:.2f}[/]"

            votes.add_row(f"{as_utc(d.ts).astimezone():%H:%M:%S}", d.broker, d.symbol, fmt("arbitrage"),
                          fmt("convergence"), fmt("smart_money"), fmt("trend"), d.result.upper(),
                          (d.risk_result or "")[:40])

        # Positions en cours
        opened = self.query_one("#open", DataTable)
        opened.clear()
        for row in open_rows:
            opened.add_row(*row)
        opened.border_subtitle = f"{len(open_rows)} ouverte(s) · P&L latent {pnl_markup(unrealized)}"

        # Positions terminées
        closed = self.query_one("#closed", DataTable)
        closed.clear()
        for row in closed_rows:
            closed.add_row(*row)
        rate = f"{wins / n_closed * 100:.0f}%" if n_closed else "-"
        closed.border_subtitle = f"{n_closed} trade(s) · gagnants {rate} · P&L réalisé {pnl_markup(realized)}"

        log = self.query_one("#log", RichLog)
        new, self._log_seen = UI_BUFFER.since(self._log_seen)
        for line in new:
            log.write(line)

    def _open_rows(self) -> tuple[list[tuple], float]:
        rows, total = [], 0.0
        for b, t in self.bot.traders.items():
            for p in self.bot.db.open_positions(b, t.mode):
                q = t.data._quotes.get(p.symbol)
                sign = -1 if p.side == "short" else 1
                price = (q.bid if sign > 0 else q.ask) if q and q.bid > 0 and q.ask > 0 else None
                fx = t.adapter.fx_rate(p.currency)
                pnl = (price - p.entry_price) * p.qty * sign * fx - (p.fees or 0) if price else None
                pct = (price / p.entry_price - 1) * 100 * sign * (p.leverage or 1) if price else None
                total += pnl or 0.0
                rows.append((p.symbol, b.value, side_markup(p.side), f"{p.leverage or 1:.0f}x", f"{p.qty:.6g}", f"{p.entry_price:.6g}",
                             "" if price is None else f"{price:.6g}", pnl_markup(pnl, ""),
                             pnl_markup(pct, " %"),
                             "suiveur" if p.take_profit_price is None else f"{p.take_profit_price:.6g}",
                             "" if p.stop_price is None else f"{p.stop_price:.6g}", t.state.flags.get(p.symbol, "")))
        return rows, total

    def _closed_rows(self, limit: int = 30) -> tuple[list[tuple], float, int, int]:
        rows, total, n, wins = [], 0.0, 0, 0
        for b, t in self.bot.traders.items():
            closed = self.bot.db.closed_positions(b, t.mode)  # current mode only: test and live never mixed
            n += len(closed)
            wins += sum(1 for p in closed if (p.pnl or 0) > 0)
            total += sum(p.pnl or 0 for p in closed)
            for p in closed[-limit:]:
                sign = -1 if p.side == "short" else 1
                pct = (p.exit_price / p.entry_price - 1) * 100 * sign * (p.leverage or 1) if p.exit_price else None
                rows.append((as_utc(p.closed_at), (p.symbol, b.value, side_markup(p.side), f"{p.leverage or 1:.0f}x",
                             f"{p.entry_price:.6g}",
                             "" if p.exit_price is None else f"{p.exit_price:.6g}", pnl_markup(p.pnl, ""),
                             pnl_markup(pct, " %"), p.exit_reason or "",
                             f"{as_utc(p.closed_at).astimezone():%d/%m %Hh%M}" if p.closed_at else "")))
        rows.sort(key=lambda r: r[0], reverse=True)  # most recent first
        return [r[1] for r in rows[:limit]], total, n, wins

    # ------------------------------------------------------------------ commands

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        line = event.value
        event.input.value = ""
        if not line.strip() and not self.proc.awaiting_confirmation:
            return
        self.query_one("#output", Static).update(f"> {line}\n…")
        self.run_worker(self._run_command(line), exclusive=False)

    async def _run_command(self, line: str) -> None:
        out = await self.proc.execute(line)
        if out == "__quit__":
            await self.action_quit()
            return
        cmd = self.query_one("#cmd", Input)
        cmd.placeholder = ("tapez la phrase de confirmation (toute autre saisie annule)"
                           if self.proc.awaiting_confirmation else "commande")
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
