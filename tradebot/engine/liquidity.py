"""Liquidity mode: hold BTC or ETH (never both) while the stablecoin supply grows.

Rules (backtested 2020-2026, see README):
* signal: total stablecoin supply (DefiLlama) up over ``window_days`` (last completed day);
* decisions on Sundays (or daily): favourable and flat -> buy the asset with the best
  ``momentum_days`` return, one tranche of ``tranche_pct`` % of capital x leverage;
  unfavourable and holding -> close the position;
* at every further ``reinject_drop_pct`` % drop from the last tranche price, add one
  tranche (same leverage), any day;
* only one of the assets is ever held, long only, no broker stop unless ``stop_loss``
  is enabled. Account-level loss limits, the kill switch and test mode still apply.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from tradebot.agents.base import Direction, Vote
from tradebot.brokers.base import Broker, BrokerError, OrderRequest, OrderType, PositionSide, Purpose, Side
from tradebot.engine.consensus import ConsensusDecision
from tradebot.engine.trader import BrokerTrader, PendingEntry

log = logging.getLogger(__name__)


class LiquidityTrader(BrokerTrader):
    def __init__(self, *args, supply=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.supply = supply
        self.status = "liquidité : pas encore évaluée"
        self.signal: tuple[float, float] | None = None
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
            await self.liquidity_step()

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
        mine = [p for p in self.db.open_positions(self.broker, self.mode) if p.symbol in self.symbols()]
        held = mine[0] if mine else None
        pending = [pe for pe in self._pending_entries.values() if pe.symbol in self.symbols()]
        exiting = {px.symbol for px in self._pending_exits.values()}

        # re-injection at every further -X % from the last tranche price (any day)
        if held and not pending and held.symbol not in exiting:
            try:
                bid = (await self.adapter.get_quote(held.symbol)).bid
            except BrokerError:
                bid = 0.0
            ref = held.last_add_price or held.entry_price
            trigger = ref * (1 - lc.reinject_drop_pct / 100)
            room = lc.max_tranches is None or (held.tranches or 1) < lc.max_tranches
            if 0 < bid <= trigger and room:
                await self._buy(held.symbol, Purpose.ADD, held.leverage or lc.leverage,
                                f"re-injection: {held.symbol} {((bid / ref) - 1) * 100:.1f}% below the last tranche")

        decision_time = lc.decision_day == "daily" or now.weekday() == 6
        if decision_time and self._decided != now.date():
            if held and not favourable and held.symbol not in exiting:
                self._record("none", f"stablecoins {change:+.2f}% over {lc.window_days}d: unfavourable, exit",
                             held.symbol, Direction.NONE)
                if await self.close_position_row(held.id, held.symbol, "liquidity_off"):
                    self._decided = now.date()
            elif not held and not pending and favourable and self.entries_enabled:
                symbol, mom = await self._strongest()
                if symbol:
                    await self._buy(symbol, Purpose.ENTRY, lc.leverage,
                                    f"stablecoins {change:+.2f}% over {lc.window_days}d: favourable; "
                                    f"{symbol} strongest ({mom:+.1f}% over {lc.momentum_days}d)")
            elif held or not favourable:
                self._decided = now.date()

        pos = (f"{held.symbol} {held.tranches or 1} tranche(s), levier {held.leverage or 1:.0f}x" if held
               else ("ordre en attente" if pending else "aucune (cash)"))
        self.status = (f"liquidité : stablecoins {change:+.2f}% sur {lc.window_days} j "
                       f"({supply / 1e9:,.1f} Md$) → {'FAVORABLE' if favourable else 'DÉFAVORABLE'} | "
                       f"position : {pos} | décision : {self._next_decision(now)}")

    async def _strongest(self) -> tuple[str | None, float]:
        best, best_mom = None, float("-inf")
        for s in self.symbols():
            try:
                bars = await self.adapter.get_bars(s, self.lcfg.momentum_days + 1)
            except BrokerError:
                continue
            if len(bars) < self.lcfg.momentum_days + 1:
                continue
            mom = (bars[-1].close / bars[-1 - self.lcfg.momentum_days].close - 1) * 100
            if mom > best_mom:
                best, best_mom = s, mom
        return best, best_mom

    def _record(self, label: str, reason: str, symbol: str, direction: Direction) -> int:
        decision = ConsensusDecision(label, 1.0 if label != "none" else 0.0, reason, None, ("liquidity",),
                                     PositionSide.LONG if label != "none" else None)
        vote = Vote("liquidity", direction, 1.0 if direction != Direction.NONE else 0.0, reason)
        return self.db.record_decision(self.broker, self.mode, symbol, decision, [vote])

    async def _buy(self, symbol: str, purpose: Purpose, leverage: float, reason: str) -> None:
        lc = self.lcfg
        acct = await self.account_state()
        quote = await self.adapter.get_quote(symbol)
        rules = await self.adapter.get_rules(symbol)
        fx = await self.adapter.fx_to_eur(rules.currency)
        price = rules.round_price(quote.bid, Side.BUY)
        if price <= 0:
            return
        capital = self.risk.capital(self.broker, acct)
        qty = rules.round_qty(capital * lc.tranche_pct / 100 * leverage / (price * fx))
        req = OrderRequest(symbol, Side.BUY, qty, OrderType.LIMIT, limit_price=price,
                           post_only=self.broker == Broker.KRAKEN, reference_price=price, purpose=purpose,
                           leverage=float(leverage), no_stop=not lc.stop_loss)
        acct.fx = fx
        dec_id = self._record("full", reason, symbol, Direction.LONG)
        rd = self.risk.approve(self.broker, req, acct, rules, 1.0)
        self.db.update_decision(dec_id, rd.reason if rd.approved else f"refused: {rd.reason}",
                                rd.request.client_id if rd.request else None)
        if not rd.approved:
            self.log.info("liquidity %s %s refused by risk: %s", purpose.value, symbol, rd.reason)
            return
        order = await self.submit(rd.request)
        if order is None:
            return
        decision = ConsensusDecision("full", 1.0, reason, None, ("liquidity",), PositionSide.LONG)
        self._pending_entries[order.client_id] = PendingEntry(
            order.id, symbol, self.clock(), decision, rd.request.stop_loss, None, order.qty * price * fx,
            PositionSide.LONG, rd.request.leverage, None, purpose)
        if purpose == Purpose.ENTRY:
            self._decided = self.clock().date()
        self.log.info("liquidity %s %s qty=%s @ %s lev %.0fx (%s)", purpose.value, symbol, order.qty, price,
                      rd.request.leverage, reason)
