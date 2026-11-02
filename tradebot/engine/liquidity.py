"""Liquidity mode: one position at a time on a fixed list of coins, driven by the stablecoin supply.

Rules (see STRATEGIE.md):
* signal: total stablecoin supply (DefiLlama) up over ``window_days`` (last completed day);
* every day: favourable -> LONG the coin with the best ``momentum_days`` return;
  unfavourable -> SHORT the coin with the worst return (if ``allow_short``), else cash;
* one position at a time across all the coins; when the wanted direction changes,
  the position is closed and the opposite one opened on a following cycle;
* tranche = ``tranche_pct`` % of capital x leverage; one more tranche at every further
  ``reinject_drop_pct`` % move against the position from the last tranche price;
* no broker stop unless ``stop_loss`` is enabled. Account loss limits, the kill switch
  and test mode still apply.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from tradebot.agents.base import Direction, Vote
from tradebot.brokers.base import Broker, BrokerError, OrderRequest, OrderType, PositionSide, Purpose, Side
from tradebot.engine.consensus import ConsensusDecision
from tradebot.engine.trader import BrokerTrader, PendingEntry

log = logging.getLogger(__name__)


@dataclass
class CoinView:
    symbol: str
    price: float | None = None
    ch_1h: float | None = None
    ch_24h: float | None = None
    ch_7d: float | None = None
    ch_30d: float | None = None
    role: str = ""


def pct(new: float | None, old: float | None) -> float | None:
    if not new or not old:
        return None
    return (new / old - 1) * 100


class LiquidityTrader(BrokerTrader):
    def __init__(self, *args, supply=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.supply = supply
        self.status = "liquidité : pas encore évaluée"
        self.signal: tuple[float, float] | None = None
        self.overview: list[CoinView] = []
        self._decided: date | None = None

    @property
    def lcfg(self):
        return self.cfg.strategy.kraken.liquidity

    def symbols(self) -> list[str]:
        q = self.cfg.strategy.kraken.quote_currency
        return [f"{a}/{q}" for a in self.lcfg.assets]

    def _rule_exits(self, p) -> bool:
        return p.symbol not in self.symbols()  # liquidity positions only exit on the signal

    async def cycle(self) -> None:
        async with self._lock:
            await self.sync_fills()
            acct = await self.account_state()
            self._record_equity(acct)
            events = self.risk.evaluate_account(self.broker, acct)
            if events:
                await self.handle_limit_events(events)
                return
            await self.manage_pending()
            await self.manage_exits()  # positions opened by other modes keep their rules
            await self.refresh_overview()
            await self.liquidity_step()

    # ------------------------------------------------------------------ market overview

    async def refresh_overview(self) -> None:
        """Price and % change over 1 h, 24 h, 7 days and 30 days for every coin of the list."""
        rows = []
        hourly = getattr(self.adapter, "get_hourly_bars", None)
        for s in self.symbols():
            v = CoinView(s)
            try:
                v.price = (await self.adapter.get_quote(s)).mid
                daily = await self.adapter.get_bars(s, self.lcfg.momentum_days + 1)
                if len(daily) > self.lcfg.momentum_days:
                    v.ch_30d = pct(v.price, daily[-1 - self.lcfg.momentum_days].close)
                if hourly:
                    h = await hourly(s, 170)
                    if len(h) > 168:
                        v.ch_1h, v.ch_24h, v.ch_7d = (pct(v.price, h[-2].close), pct(v.price, h[-25].close),
                                                      pct(v.price, h[-169].close))
                elif len(daily) > 7:
                    v.ch_24h, v.ch_7d = pct(v.price, daily[-1].close), pct(v.price, daily[-8].close)
            except BrokerError as exc:
                self.log.debug("overview %s unavailable: %s", s, exc)
            rows.append(v)
        self.overview = rows

    def _ranked(self) -> list[CoinView]:
        return sorted((v for v in self.overview if v.ch_30d is not None), key=lambda v: v.ch_30d, reverse=True)

    # ------------------------------------------------------------------ decisions

    def _next_decision(self, now: datetime) -> str:
        if self.lcfg.decision_day == "daily":
            return "chaque jour"
        days = (6 - now.weekday()) % 7
        return "aujourd'hui (dimanche)" if days == 0 else f"dimanche {(now + timedelta(days=days)):%d/%m}"

    async def liquidity_step(self) -> None:
        now = self.clock()
        lc = self.lcfg
        try:
            self.signal = await self.supply.change(lc.window_days, now)
        except Exception as exc:  # noqa: BLE001
            self.status = f"liquidité : données DefiLlama indisponibles ({type(exc).__name__})"
            self.log.warning("stablecoin supply unavailable: %s", exc)
            return
        if self.signal is None:
            self.status = "liquidité : historique insuffisant"
            return
        change, supply = self.signal
        favourable = change > 0
        want = PositionSide.LONG if favourable else (PositionSide.SHORT if lc.allow_short else None)
        mine = [p for p in self.db.open_positions(self.broker, self.mode) if p.symbol in self.symbols()]
        held = mine[0] if mine else None
        held_side = PositionSide(held.side) if held else None
        pending = [pe for pe in self._pending_entries.values() if pe.symbol in self.symbols()]
        exiting = {px.symbol for px in self._pending_exits.values()} & set(self.symbols())

        ranked = self._ranked()
        long_pick = ranked[0].symbol if ranked else None
        short_pick = ranked[-1].symbol if ranked else None
        for v in self.overview:
            v.role = ""
            if held and v.symbol == held.symbol:
                v.role = f"EN POSITION {held_side.value.upper()}"
            elif not held and want == PositionSide.LONG and v.symbol == long_pick:
                v.role = "candidat LONG"
            elif not held and want == PositionSide.SHORT and v.symbol == short_pick:
                v.role = "candidat SHORT"

        # re-injection at every further move of X % against the position (any day)
        if held and not pending and held.symbol not in exiting:
            try:
                q = await self.adapter.get_quote(held.symbol)
                px = q.bid if held_side == PositionSide.LONG else q.ask
            except BrokerError:
                px = 0.0
            ref = held.last_add_price or held.entry_price
            adverse = (px / ref - 1) * held_side.sign * 100 if px > 0 else 0.0
            room = lc.max_tranches is None or (held.tranches or 1) < lc.max_tranches
            if adverse <= -lc.reinject_drop_pct and room:
                await self._open(held.symbol, held_side, Purpose.ADD, held.leverage or lc.leverage,
                                 f"re-injection: {held.symbol} {adverse:+.1f}% against the {held_side.value} "
                                 f"since the last tranche")

        decision_time = lc.decision_day == "daily" or now.weekday() == 6
        if decision_time and self._decided != now.date():
            if held and held_side != want and held.symbol not in exiting:
                for cid, pe in list(self._pending_entries.items()):  # unfilled re-injections die with the position
                    if pe.symbol == held.symbol:
                        await self.adapter.cancel_order(pe.order_id)
                        self._pending_entries.pop(cid, None)
                self._record("none", f"stablecoins {change:+.2f}% over {lc.window_days}d: "
                                     f"{'favourable' if favourable else 'unfavourable'}, close {held_side.value}",
                             held.symbol, Direction.NONE)
                await self.close_position_row(held.id, held.symbol, "liquidity_off")
            elif not held and not pending and not exiting and want is not None and self.entries_enabled:
                pick = long_pick if want == PositionSide.LONG else short_pick
                v = next((x for x in self.overview if x.symbol == pick), None)
                if pick:
                    word = "strongest" if want == PositionSide.LONG else "weakest"
                    await self._open(pick, want, Purpose.ENTRY, lc.leverage,
                                     f"stablecoins {change:+.2f}% over {lc.window_days}d: "
                                     f"{'favourable' if favourable else 'unfavourable'}; {pick} {word} "
                                     f"({v.ch_30d:+.1f}% over {lc.momentum_days}d)")
            elif held and held_side == want:
                self._decided = now.date()
            elif not held and want is None:
                self._decided = now.date()

        if held:
            pos = f"{held_side.value.upper()} {held.symbol}, {held.tranches or 1} tranche(s), levier {held.leverage or 1:.0f}x"
        else:
            pos = "ordre en attente" if pending else ("fermeture en cours" if exiting else "aucune (cash)")
        target = {PositionSide.LONG: "LONG", PositionSide.SHORT: "SHORT", None: "CASH"}[want]
        self.status = (f"stablecoins {change:+.2f}% sur {lc.window_days} j ({supply / 1e9:,.1f} Md$) → "
                       f"{'FAVORABLE' if favourable else 'DÉFAVORABLE'} → cible {target} | position : {pos} | "
                       f"décision : {self._next_decision(now)}")

    def _record(self, label: str, reason: str, symbol: str, direction: Direction,
                side: PositionSide | None = None) -> int:
        decision = ConsensusDecision(label, 1.0 if label != "none" else 0.0, reason, None, ("liquidity",), side)
        vote = Vote("liquidity", direction, 1.0 if direction != Direction.NONE else 0.0, reason)
        return self.db.record_decision(self.broker, self.mode, symbol, decision, [vote])

    async def _open(self, symbol: str, side: PositionSide, purpose: Purpose, leverage: float, reason: str) -> None:
        lc = self.lcfg
        acct = await self.account_state()
        quote = await self.adapter.get_quote(symbol)
        rules = await self.adapter.get_rules(symbol)
        fx = await self.adapter.fx_to_eur(rules.currency)
        price = rules.round_price(quote.bid if side == PositionSide.LONG else quote.ask, side.entry_side)
        if price <= 0:
            return
        capital = self.risk.capital(self.broker, acct)
        qty = rules.round_qty(capital * lc.tranche_pct / 100 * leverage / (price * fx))
        req = OrderRequest(symbol, side.entry_side, qty, OrderType.LIMIT, limit_price=price,
                           post_only=self.broker == Broker.KRAKEN, reference_price=price, purpose=purpose,
                           leverage=float(leverage), no_stop=not lc.stop_loss)
        acct.fx = fx
        direction = Direction.LONG if side == PositionSide.LONG else Direction.SHORT
        dec_id = self._record("full", reason, symbol, direction, side)
        rd = self.risk.approve(self.broker, req, acct, rules, 1.0)
        self.db.update_decision(dec_id, rd.reason if rd.approved else f"refused: {rd.reason}",
                                rd.request.client_id if rd.request else None)
        if not rd.approved:
            self.log.info("liquidity %s %s %s refused by risk: %s", purpose.value, side.value, symbol, rd.reason)
            return
        order = await self.submit(rd.request)
        if order is None:
            return
        decision = ConsensusDecision("full", 1.0, reason, None, ("liquidity",), side)
        self._pending_entries[order.client_id] = PendingEntry(
            order.id, symbol, self.clock(), decision, rd.request.stop_loss, None, order.qty * price * fx,
            side, rd.request.leverage, None, purpose)
        if purpose == Purpose.ENTRY:
            self._decided = self.clock().date()
        self.log.info("liquidity %s %s %s qty=%s @ %s lev %.0fx (%s)", purpose.value, side.value, symbol, order.qty,
                      price, rd.request.leverage, reason)
