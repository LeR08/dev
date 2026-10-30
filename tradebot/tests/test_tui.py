from __future__ import annotations

from textual.widgets import Input, Static

from tradebot.ui.tui import TradebotApp


async def test_tui_shows_test_badges_and_runs_commands(make_bot):
    bot = make_bot()
    app = TradebotApp(bot)
    async with app.run_test() as pilot:
        header = str(app.query_one("#header", Static).render())
        assert header.count("TEST") == 2 and "LIVE" not in header
        app.query_one("#cmd", Input).value = "risk show"
        await pilot.press("enter")
        await pilot.pause(0.5)
        await app.workers.wait_for_complete()
        out = str(app.query_one("#output", Static).render())
        assert "live_capital_cap_eur" in out


async def test_tui_shows_open_and_closed_pnl(make_bot):
    from datetime import datetime, timezone

    from tradebot.brokers.base import Broker, Mode
    from textual.widgets import DataTable

    bot = make_bot()
    bot.db.open_position(broker=Broker.KRAKEN, mode=Mode.TEST, symbol="BTC/EUR", qty=0.001, entry_price=50_000.0,
                         stop_price=48_500.0)
    pid = bot.db.open_position(broker=Broker.KRAKEN, mode=Mode.TEST, symbol="ETH/EUR", qty=0.01,
                               entry_price=3_000.0).id
    bot.db.close_position(pid, 3_100.0, "take_profit", 0.95, 0.05, datetime.now(timezone.utc))
    bot.adapters[Broker.KRAKEN].set_price("BTC/EUR", 51_000)
    bot.traders[Broker.KRAKEN].data.set_quotes({"BTC/EUR": bot.adapters[Broker.KRAKEN].quotes["BTC/EUR"]})
    app = TradebotApp(bot)
    async with app.run_test(size=(140, 40)) as pilot:
        await pilot.pause()
        opened, closed = app.query_one("#open", DataTable), app.query_one("#closed", DataTable)
        assert opened.row_count == 1 and closed.row_count == 1
        assert "+0.95" in str(closed.border_subtitle) and "gagnants 100%" in str(closed.border_subtitle)
        assert "latent" in str(opened.border_subtitle)


def test_log_buffer_keeps_updating_after_it_is_full():
    import logging

    from tradebot.logging_setup import UiBufferHandler

    buf = UiBufferHandler(maxlen=5)
    log = logging.getLogger("bufftest")
    log.addHandler(buf)
    log.setLevel(logging.INFO)
    seen = 0
    for i in range(12):
        log.info("line %d", i)
        new, seen = buf.since(seen)
        assert len(new) == 1 and new[0].endswith(f"line {i}")
    log.info("a")
    log.info("b")
    new, seen = buf.since(seen)
    assert [x[-1] for x in new] == ["a", "b"]
    log.removeHandler(buf)
