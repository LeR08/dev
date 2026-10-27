# tradebot — local trading bot for Kraken Pro & Interactive Brokers

A fully local, automated trading bot: one shared strategy engine (scanner → 3 agents → consensus →
RiskManager → mode switch) feeding two broker adapters with broker-specific execution:

* **Kraken Pro**: crypto spot vs EUR (MiCA-authorised CASP).
* **Interactive Brokers**: EU/US stocks & ETFs, cash account (Interactive Brokers Ireland), via a local IB Gateway.

**Test mode is ON for both brokers at every start.** Only the typed `live on <broker>` command, with all
preconditions met and the exact phrase `I ACCEPT REAL LOSSES ON <BROKER>`, can trade real money.

> No promise of returns. Judge the bot on its backtest and paper results only, and only once there are
> more than 100 trades (reports flag smaller samples as *NOT SIGNIFICANT*).

Out of scope (by design): prediction markets, VPN/geo-circumvention, unregulated exchanges, leverage,
margin, short selling, futures, options, cloud services, paid data feeds, LLM calls in the trading loop.

## Install

```bash
uv sync --extra dev          # or: pip install -e ".[dev]"
cp .env.example .env         # fill in only what you need; .env is git-ignored
```

Everything works in test mode without any key (Kraken public data, mempool.space, SEC EDGAR, AMF BDIF).
Optional free keys: an Etherscan key (ETH/ERC-20 flows) and Kraken API keys (fee tier + order dry-run).

**Kraken API key**: permissions *Query* + *Trade* only. **Withdrawals must be disabled** (verified before
going live). An IP restriction is recommended.

**IBKR**: run IB Gateway on this machine. Paper login on port 4002 (test), live login on port 4001.
The adapter refuses the live port while test mode is ON, refuses a non-paper account in test mode
(paper ids start with `D`), and only connects to localhost. v1 uses free delayed data (~15 min).

## Run

```bash
bot                      # Textual dashboard (or: python -m tradebot)
bot run [kraken|ibkr]    # headless loop with a plain prompt
bot scan kraken          # one-shot commands for scripting
bot votes BTC/EUR
bot report week
bot backtest kraken 2026-01-01 2026-06-30
```

| Command | Effect |
|---|---|
| `start [kraken\|ibkr\|all]` | start trading loops (always in test mode) |
| `stop [broker]` | stop new entries; keep managing open positions |
| `status` | modes, connections, equity, positions, risk halts, flags |
| `positions` / `orders` | open positions / open orders |
| `scan [broker]` | one scan, no trading |
| `votes <symbol>` | the three agents' current votes + consensus |
| `close <symbol>` / `close all [broker]` | close one / all positions |
| `kill` (Ctrl+K in the TUI) | cancel all orders, close all positions, every broker → TEST (≤ 30 s) |
| `live on <broker>` / `live off <broker>` | leave / return to test mode |
| `risk show` / `risk set <broker>.<key> <value>` | view / change a limit (logged) |
| `risk review <broker>` | clear a drawdown halt after manual review (stays in TEST) |
| `backtest <broker> <from> <to>` | backtest + walk-forward report |
| `report [day\|week\|all]` | P&L, win rate, drawdown, fees — by broker and mode, never mixed |
| `config reload` | reload the YAML files |

## How it works

```
tradebot/
  config/     strategy.yaml, risk.yaml, universe_ibkr.yaml, wallet_labels.yaml
  brokers/    base.py (interface), kraken.py, ibkr.py, paper_engine.py
  data/       kraken_feed.py, onchain.py (Etherscan, mempool.space), edgar.py (Form 4, 13F), amf.py (BDIF), cache.py
  engine/     scanner.py, consensus.py, risk.py, mode.py, exits.py, trader.py (loop), snapshots.py
  agents/     arbitrage.py, convergence.py, smart_money.py, pool.py (one process per agent)
  ui/         tui.py (Textual), cli.py, commands.py
  backtest/   runner.py, report.py
  storage/    models.py, db.py (SQLite: data/bot.db)
  tests/
```

* **Scanner** (every cycle): spread, Kraken order-book depth / IBKR average daily volume, time windows
  (IBKR first/last 15 min, earnings days from `universe_ibkr.yaml`; Kraken low-liquidity hours).
* **Agents** (rule-based, one worker process each, read-only snapshot, no shared memory):
  * *Arbitrage*: Kraken triangle EUR→X→bridge→EUR net of 3 taker fees + slippage; IBKR pair trading
    (LONG the cheap leg only).
  * *Convergence*: price ≥ k σ below VWAP/SMA with volume confirmation (IBKR: confidence reduced for delayed data).
  * *Smart money*: Kraken — flows to/from labelled exchange wallets (`wallet_labels.yaml` is the only
    source of wallet ownership); IBKR — insider cluster buying / heavy selling (SEC Form 4, AMF BDIF
    declarations; 10b5-1 planned sales ignored), optional 13F holdings change.
* **Consensus**: any AVOID → no trade; 2–3 LONG → full size; 1 LONG → half size; 0 → no trade.
  Every decision is stored with the three votes and reasons.
* **RiskManager**: every order (test or live, entry or exit) must carry an HMAC-signed approval;
  adapters refuse anything else. Limits from `risk.yaml` (5 % / 2.5 % per position, 5 positions,
  30 % exposure, 3 % stop, 3 % daily loss, 15 % drawdown, 10 orders/min, live capital cap with no default).
  Daily loss → close positions, test mode, entries halted until the next day. Drawdown → same, until
  `risk review`.
* **Execution**: Kraken post-only limit entries with a conditional stop-loss close attached; exits
  limit-first, market after a timeout. IBKR bracket orders (limit entry + take-profit + stop-loss),
  orders only during exchange sessions (holidays included); weekend/holiday holds are flagged.
  Failed submissions are never retried blindly (Kraken `userref` / IBKR `orderRef` lookups first).
* **Exits** (first hit wins): 85 % of the move to the agent's target, volume spike with stalling price
  (after entry), smart-money flip to AVOID, stop-loss (also held at the broker), time stop, kill switch.
* **Test mode**: Kraken → internal paper engine filled against live order books (fees, slippage,
  optional `validate=true` dry-run); IBKR → native paper account, sizing capped to the configured paper
  balance (default 1 000 EUR per broker).
* **Backtest**: same scanner, agents, consensus, RiskManager and exits, with the paper engine as broker;
  next-bar execution, fees, spread, slippage, IBKR delay; walk-forward grid on train windows, evaluated on
  unseen test windows. Kraken's OHLC endpoint returns only the last 720 bars per interval: history grows
  in the local cache while the bot runs. IBKR history is cached from the paper Gateway.

## Going live (per broker)

`live on kraken` shows the active limits and paper results, then refuses unless: ≥ 50 closed paper trades,
≥ 14 days in paper, live keys present (Kraken) / `IBKR_LIVE_ACCOUNT` set, Kraken key cannot withdraw,
every risk limit set (including `live_capital_cap_eur`), and no active risk halt. Then type the exact phrase.
The switch is logged; any restart, `kill`, `live off`, loss limit or order-handling error returns to TEST.
Test live mode first with the minimum order size (e.g. `risk set kraken.live_capital_cap_eur 20`).

## Tests

```bash
pytest
```

Covers the acceptance criteria: start in test mode, the single live code path (static AST check),
IBKR live-port refusal, RiskManager resize/refusal and approval enforcement, broker-side stop-losses,
kill switch < 30 s, backtest/report fields and the < 100 trades flag.

## Security

Secrets live only in `.env` (git-ignored) and are masked in every log line and error message. Logs are
structured JSON in `logs/`, rotated daily. The UI is local only: no web server, no remote control port.
The only outbound calls go to the brokers and the free public data APIs listed above.
