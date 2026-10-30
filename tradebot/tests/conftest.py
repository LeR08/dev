from __future__ import annotations

import pytest

from tradebot.app import Bot
from tradebot.brokers.base import Broker
from tradebot.engine.profiles import apply_profile
from tradebot.settings import Secrets, load_config as _load_config
from tradebot.storage.db import Database
from tradebot.tests.fakes import FakeAdapter


def load_config():
    """Tests run on the normal profile, whatever risk.yaml says."""
    cfg = _load_config()
    apply_profile(cfg, "normal")
    return cfg


@pytest.fixture
def cfg():
    return load_config()


@pytest.fixture
def db():
    return Database("sqlite:///:memory:")


@pytest.fixture
def make_bot(tmp_path, db):
    """Bot wired to in-memory fake brokers (no network)."""

    def _make(secrets: Secrets | None = None, cash: float = 1000.0) -> Bot:
        def adapters(mode):
            return {Broker.KRAKEN: FakeAdapter(Broker.KRAKEN, mode, cash, symbols=("BTC/EUR",)),
                    Broker.IBKR: FakeAdapter(Broker.IBKR, mode, cash, symbols=("AAPL",))}

        bot = Bot(home=tmp_path, isolated_agents=False, db=db, secrets=secrets or Secrets(),
                  config=load_config(), adapters=adapters)
        bot.data.onchain = bot.data.edgar = bot.data.amf = None  # tests never touch the network
        return bot

    return _make
