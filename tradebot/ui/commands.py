"""Command interpreter shared by the Textual TUI and the plain CLI."""

from __future__ import annotations

import shlex
from datetime import datetime, timedelta, timezone

from tradebot.backtest.report import MIN_SIGNIFICANT_TRADES, max_drawdown_pct
from tradebot.brokers.base import Broker, BrokerError, Mode
from tradebot.engine.mode import confirm_phrase
from tradebot.storage.db import as_utc

HELP = """Commands
  start [kraken|ibkr|all]        start trading loops (always in test mode)
  stop [broker]                  stop new entries, keep managing positions
  status                         modes, connections, equity, positions
  positions | orders             open positions | open orders
  scan [broker]                  run one scan without trading
  votes <symbol>                 the three agents' current votes
  close <symbol> | close all [broker]
  kill                           cancel all orders, close all positions, all brokers -> TEST
  live on <broker> | live off <broker>
  risk show | risk set <key> <value> | risk review <broker>
  backtest <broker> <from> <to>  e.g. backtest kraken 2026-01-01 2026-06-30
  report [day|week|all]
  trades [n]                     last closed trades with agents, stop, target, result in R
  config reload
  help | quit"""


def table(headers: list[str], rows: list[list]) -> str:
    cells = [[str(h) for h in headers]] + [[("" if c is None else str(c)) for c in r] for r in rows]
    widths = [max(len(r[i]) for r in cells) for i in range(len(headers))]
    fmt = "  ".join("{:<" + str(w) + "}" for w in widths)
    out = [fmt.format(*cells[0]), fmt.format(*["-" * w for w in widths])]
    out += [fmt.format(*r) for r in cells[1:]]
    return "\n".join(out)


def _f(x: float | None, digits: int = 2) -> str:
    return "" if x is None else f"{x:,.{digits}f}"


class CommandProcessor:
    def __init__(self, bot):
        self.bot = bot
        self.pending_live: Broker | None = None

    @property
    def awaiting_confirmation(self) -> bool:
        return self.pending_live is not None

    async def execute(self, line: str) -> str:
        if self.pending_live is not None:
            broker, self.pending_live = self.pending_live, None
            return await self.bot.go_live(broker, line)
        try:
            parts = shlex.split(line.strip())
        except ValueError as exc:
            return f"parse error: {exc}"
        if not parts:
            return ""
        cmd, args = parts[0].lower(), parts[1:]
        handler = getattr(self, f"cmd_{cmd}", None)
        if handler is None:
            return f"unknown command '{cmd}'. Type 'help'."
        try:
            return await handler(args)
        except (ValueError, KeyError) as exc:
            return f"error: {exc}"
        except BrokerError as exc:
            return f"broker error: {exc}"

    # ------------------------------------------------------------------ commands

    async def cmd_help(self, args) -> str:
        return HELP

    async def cmd_start(self, args) -> str:
        return "\n".join(await self.bot.start(args[0] if args else "all"))

    async def cmd_stop(self, args) -> str:
        return "\n".join(self.bot.stop(args[0] if args else "all"))

    async def cmd_status(self, args) -> str:
        rows = []
        for b, t in self.bot.traders.items():
            st = t.state
            rows.append([b.value, t.mode.value.upper(), "yes" if self.bot.adapters[b].connected else "no",
                         "running" if t.running else "stopped", "on" if t.entries_enabled else "off",
                         _f(st.equity), _f(st.daily_pnl), len(self.bot.db.open_positions(b, t.mode)),
                         self.bot.risk.halt_reason(b) or "", st.last_error or ""])
        out = table(["broker", "mode", "connected", "loop", "entries", "equity EUR", "daily P&L", "positions",
                     "halt", "last error"], rows)
        flags = [f"  {b}:{s} {msg}" for b, t in self.bot.traders.items() for s, msg in t.state.flags.items()]
        if flags:
            out += "\nFlags:\n" + "\n".join(flags)
        return out

    async def cmd_positions(self, args) -> str:
        rows = []
        for b, t in self.bot.traders.items():
            positions = self.bot.db.open_positions(b, t.mode)
            if not positions:
                continue
            quotes = {}
            try:
                quotes = await t._quotes([p.symbol for p in positions]) if self.bot.adapters[b].connected else {}
            except BrokerError:
                pass
            for p in positions:
                q = quotes.get(p.symbol)
                sign = -1 if p.side == "short" else 1
                price = (q.bid if sign > 0 else q.ask) if q else None
                pnl = (price - p.entry_price) * p.qty * sign if price else None
                rows.append([p.symbol, b.value, p.side.upper(), f"{p.leverage or 1:.1f}x", _f(p.qty, 6),
                             _f(p.entry_price, 4), _f(price, 4), _f(pnl), _f(p.take_profit_price, 4),
                             _f(p.stop_price, 4), t.state.flags.get(p.symbol, "")])
        if not rows:
            return "no open positions"
        return table(["symbol", "broker", "side", "lev", "size", "entry", "price", "P&L", "take-profit", "stop", "flag"],
                     rows)

    async def cmd_orders(self, args) -> str:
        rows = []
        for b, a in self.bot.adapters.items():
            if not a.connected:
                continue
            for o in await a.get_open_orders():
                rows.append([o.id, b.value, a.mode.value.upper(), o.symbol, o.side.value, o.order_type.value,
                             _f(o.qty, 6), _f(o.limit_price, 4), _f(o.stop_price, 4), o.purpose.value])
        if not rows:
            return "no open orders"
        return table(["id", "broker", "mode", "symbol", "side", "type", "qty", "limit", "stop", "purpose"], rows)

    async def cmd_scan(self, args) -> str:
        out = []
        for b in self.bot.brokers(args[0] if args else "all"):
            try:
                await self.bot.ensure_connected(b)
                r = await self.bot.traders[b].scan(record=True)
            except Exception as exc:  # noqa: BLE001
                out.append(f"{b}: scan failed ({type(exc).__name__}: {exc})")
                continue
            out.append(f"{b}: scanned {r.scanned}, passed {len(r.passed)} ({r.pass_rate:.0%}), "
                       f"top rejections: {', '.join(f'{k}={v}' for k, v in r.top_reasons(5)) or 'none'}")
            if r.passed:
                out.append("  passed: " + ", ".join(r.passed[:40]) + (" …" if len(r.passed) > 40 else ""))
        return "\n".join(out)

    async def cmd_votes(self, args) -> str:
        if not args:
            raise ValueError("usage: votes <symbol>")
        symbol = args[0].upper()
        b = self.bot.broker_for_symbol(symbol)
        await self.bot.ensure_connected(b)
        decision, votes = await self.bot.traders[b].votes_for(symbol)
        rows = [[v.agent, v.direction.value, f"{v.confidence:.2f}", _f(v.target_price, 4), v.reason] for v in votes]
        return table(["agent", "vote", "conf", "target", "reason"], rows) + \
            f"\nconsensus: {decision.label.upper()} (size x{decision.size_factor}) — {decision.reason}"

    async def cmd_close(self, args) -> str:
        if not args:
            raise ValueError("usage: close <symbol> | close all [broker]")
        if args[0].lower() == "all":
            out = []
            for b in self.bot.brokers(args[1] if len(args) > 1 else "all"):
                await self.bot.ensure_connected(b)
                out += [f"{b}: {x}" for x in await self.bot.traders[b].close_all("manual_close")] or [f"{b}: nothing open"]
            return "\n".join(out)
        symbol = args[0].upper()
        b = self.bot.broker_for_symbol(symbol)
        await self.bot.ensure_connected(b)
        return await self.bot.traders[b].close_symbol(symbol)

    async def cmd_kill(self, args) -> str:
        return "\n".join(await self.bot.kill())

    async def cmd_live(self, args) -> str:
        if len(args) != 2 or args[0] not in ("on", "off"):
            raise ValueError("usage: live on <broker> | live off <broker>")
        b = Broker(args[1].lower())
        if args[0] == "off":
            return self.bot.live_off(b)
        pre, summary = await self.bot.live_summary(b)
        if not all(p.ok for p in pre):
            return summary + "\nREFUSED: preconditions not met."
        self.pending_live = b
        return summary + f"\n\nTo continue, type exactly:\n  {confirm_phrase(b)}\n(anything else cancels)"

    async def cmd_risk(self, args) -> str:
        if not args or args[0] == "show":
            rows = []
            for b in Broker:
                cfg = self.bot.risk.cfg(b)
                for k, v in cfg.model_dump().items():
                    rows.append([b.value, k, "NOT SET" if v is None else v])
            return table(["broker", "limit", "value"], rows)
        if args[0] == "set" and len(args) == 3:
            return "\n".join(self.bot.risk.set_limit(args[1], args[2]))
        if args[0] == "review" and len(args) == 2:
            b = Broker(args[1].lower())
            reason = self.bot.risk.review(b)
            return f"{b}: risk halt cleared ({reason or 'none was active'}); broker stays in TEST mode"
        raise ValueError("usage: risk show | risk set <key> <value> | risk review <broker>")

    async def cmd_backtest(self, args) -> str:
        if len(args) != 3:
            raise ValueError("usage: backtest <broker> <from YYYY-MM-DD> <to YYYY-MM-DD>")
        b = Broker(args[0].lower())
        start = datetime.fromisoformat(args[1]).replace(tzinfo=timezone.utc)
        end = datetime.fromisoformat(args[2]).replace(tzinfo=timezone.utc)
        if end <= start:
            raise ValueError("end date must be after start date")
        return await self.bot.backtest(b, start, end)

    async def cmd_report(self, args) -> str:
        period = args[0] if args else "all"
        now = datetime.now(timezone.utc)
        since = {"day": now - timedelta(days=1), "week": now - timedelta(days=7), "all": None}.get(period)
        if period not in ("day", "week", "all"):
            raise ValueError("usage: report [day|week|all]")
        rows = []
        for b in Broker:
            for m in Mode:  # test and live are never mixed
                closed = self.bot.db.closed_positions(b, m, since)
                curve = [e.equity for e in self.bot.db.equity_curve(b, m, since)]
                if not closed and not curve:
                    continue
                pnl = sum(p.pnl or 0 for p in closed)
                wins = sum(1 for p in closed if (p.pnl or 0) > 0)
                rows.append([b.value, m.value.upper(), len(closed), _f(pnl),
                             f"{wins / len(closed) * 100:.1f}%" if closed else "",
                             f"{max_drawdown_pct(curve):.2f}%" if curve else "",
                             _f(self.bot.db.fees_paid(b, m, since)),
                             "" if len(closed) >= MIN_SIGNIFICANT_TRADES else "NOT SIGNIFICANT (<100 trades)"])
        if not rows:
            return f"no trading activity ({period})"
        return table(["broker", "mode", "trades", "P&L EUR", "win rate", "max DD", "fees EUR", "note"], rows)

    async def cmd_trades(self, args) -> str:
        n = int(args[0]) if args else 20
        rows = []
        for b, t in self.bot.traders.items():
            for p in self.bot.db.closed_positions(b, t.mode)[-n:]:
                sign = -1 if p.side == "short" else 1
                init = p.initial_stop_price or p.stop_price
                risk = abs(p.entry_price - init) if init else None
                r_mult = (p.exit_price - p.entry_price) * sign / risk if risk and p.exit_price else None
                held = (as_utc(p.closed_at) - as_utc(p.opened_at)) if p.closed_at else None
                rows.append([as_utc(p.closed_at).astimezone().strftime("%d/%m %H:%M") if p.closed_at else "",
                             p.symbol, p.side.upper(), f"{p.leverage or 1:.1f}x", ",".join(p.entry_agents or []),
                             _f(p.entry_price, 6), _f(init, 6), _f(p.target_price, 6), _f(p.exit_price, 6),
                             "" if r_mult is None else f"{r_mult:+.2f}R", _f(p.pnl), _f(p.fees),
                             p.exit_reason or "", str(held).split(".")[0] if held else ""])
        if not rows:
            return "no closed trades yet"
        return table(["closed", "symbol", "side", "lev", "agents", "entry", "init stop", "target", "exit", "R",
                      "P&L EUR", "fees", "reason", "held"], rows)

    async def cmd_config(self, args) -> str:
        if args[:1] != ["reload"]:
            raise ValueError("usage: config reload")
        return self.bot.reload_config()

    async def cmd_quit(self, args) -> str:
        return "__quit__"

    cmd_exit = cmd_quit
