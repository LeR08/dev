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
