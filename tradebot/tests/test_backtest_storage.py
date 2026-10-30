from __future__ import annotations

import json
import logging
from datetime import timedelta

import numpy as np

from tradebot.backtest.report import compute_metrics, format_metrics
from tradebot.backtest.runner import Backtester
from tradebot.brokers.base import Bar, Broker, Mode
from tradebot.logging_setup import JsonFormatter, MASKER, SecretMaskFilter
from tradebot.tests.fakes import T0


def noisy_bars(n=600, seed=3):
    rng = np.random.default_rng(seed)
    price = 100.0
    out = []
    for i in range(n):
        ret = rng.normal(0, 0.002)
        if i % 50 == 49:
            ret = -0.05  # periodic dips -> mean reversion trades worth their fees
        elif i >= 50 and i % 50 < 10:
            ret += 0.005  # ...that recover, so there is no lasting trend
        o = price
        price = price * (1 + ret)
        vol = 100 * (4 if i % 50 == 49 else 1) * rng.uniform(0.8, 1.2)
        out.append(Bar(T0 + timedelta(minutes=15 * i), o, max(o, price) * 1.001, min(o, price) * 0.999, price,
                       vol * 1000))
    return out


def test_backtest_reports_fees_drawdown_and_flags_small_samples(cfg):
    cfg.strategy.kraken.scanner.min_depth_eur = 0
    cfg.strategy.kraken.agents.convergence.volume_mult = 1.5
    bars = {"BTC/EUR": noisy_bars()}
    bt = Backtester(cfg, Broker.KRAKEN, bars, timedelta(minutes=15))
    res = bt.run(bars["BTC/EUR"][0].ts, bars["BTC/EUR"][-1].ts)
    m = res.metrics
    assert m.n_trades > 0 and m.fees_paid > 0
    assert m.max_drawdown_pct >= 0 and m.buy_and_hold_return_pct is not None
    text = res.report()
    assert "fees paid" in text and "max drawdown" in text and "NOT SIGNIFICANT" in text
    _, wf = bt.walk_forward(bars["BTC/EUR"][0].ts, bars["BTC/EUR"][-1].ts)
    assert "fold 1" in wf and "out-of-sample trades" in wf


def test_metrics_significance():
    m = compute_metrics([], [1000, 1010, 990, 1020], 365, 1000)
    assert m.max_drawdown_pct > 1.9 and not m.significant
    assert "NOT SIGNIFICANT" in format_metrics(m, "x")


def test_every_row_carries_broker_and_mode(db):
    from tradebot.storage import models

    for table in models.Base.metadata.sorted_tables:
        assert {"broker", "mode"} <= set(table.columns.keys()), table.name
    db.record_equity(Broker.KRAKEN, Mode.TEST, 1000, 1000, 0, 0)
    db.record_equity(Broker.KRAKEN, Mode.LIVE, 50, 50, 0, 0)
    assert [e.equity for e in db.equity_curve(Broker.KRAKEN, Mode.TEST)] == [1000]
    assert [e.equity for e in db.equity_curve(Broker.KRAKEN, Mode.LIVE)] == [50]


def test_secrets_are_masked_in_logs():
    MASKER.update(["supersecretvalue123"])
    rec = logging.LogRecord("x", logging.ERROR, __file__, 1, "key=%s API-Key: abcd1234", ("supersecretvalue123",), None)
    SecretMaskFilter().filter(rec)
    line = JsonFormatter().format(rec)
    assert "supersecretvalue123" not in line and "abcd1234" not in line
    assert json.loads(line)["mode"]


def test_secrets_repr_hidden():
    from pydantic import SecretStr

    from tradebot.settings import Secrets

    s = Secrets(kraken_api_key=SecretStr("abc123456"))
    assert "abc123456" not in repr(s) and "abc123456" not in str(s)
