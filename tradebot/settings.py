"""Configuration loading (YAML -> pydantic) and local secrets (.env)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

import yaml
from dotenv import dotenv_values
from pydantic import BaseModel, ConfigDict, Field, SecretStr

PACKAGE_DIR = Path(__file__).resolve().parent


def home_dir() -> Path:
    return Path(os.environ.get("TRADEBOT_HOME", PACKAGE_DIR.parent))


def config_dir() -> Path:
    return Path(os.environ.get("TRADEBOT_CONFIG_DIR", PACKAGE_DIR / "config"))


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------- strategy


class KrakenScannerCfg(_Model):
    max_spread_bps: float = 30
    depth_levels: int = 10
    min_depth_eur: float = 20_000
    low_liquidity_hours_utc: list[int] = []
    include_only: list[str] = []
    exclude: list[str] = []


class KrakenBarsCfg(_Model):
    interval_minutes: int = 60
    lookback: int = 300


class ArbitrageKrakenCfg(_Model):
    enabled: bool = True
    bridges: list[str] = ["BTC", "ETH"]
    min_edge_bps: float = 15
    slippage_bps: float = 5


class ConvergenceCfg(_Model):
    enabled: bool = True
    reference: Literal["vwap", "sma"] = "vwap"
    window: int = 48
    k_std: float = 2.0
    volume_mult: float = 1.5
    volume_window: int = 48
    delay_penalty: float = 0.0
    trend_window: int = 192  # long moving average used as trend filter (bars)
    max_trend_pct: float = 2.0  # no LONG if that average fell more than this over `window` bars (SHORT: rose)


class SmartMoneyKrakenCfg(_Model):
    enabled: bool = True
    window_hours: int = 24
    min_net_flow_eur: float = 5_000_000
    min_tx_eur: float = 250_000
    erc20: dict[str, tuple[str, int]] = {}


class KrakenAgentsCfg(_Model):
    arbitrage: ArbitrageKrakenCfg = ArbitrageKrakenCfg()
    convergence: ConvergenceCfg = ConvergenceCfg()
    smart_money: SmartMoneyKrakenCfg = SmartMoneyKrakenCfg()


class LeverageCfg(_Model):
    """Automatic leverage: target_daily_vol / realised daily vol, clamped to [1, risk max_leverage]."""

    enabled: bool = True
    target_daily_vol_pct: float = 2.0
    vol_lookback_bars: int = 96
    full_consensus_only: bool = False  # True: half-size signals always trade at 1x


class FinancingCfg(_Model):
    """Costs of margin/short positions (used by the paper engine and P&L)."""

    open_fee_bps: float = 0.0  # Kraken margin opening fee
    rollover_bps_per_4h: float = 0.0  # Kraken rollover, on borrowed notional
    borrow_fee_pct_year: float = 0.0  # IBKR stock borrow (shorts)
    margin_interest_pct_year: float = 0.0  # IBKR interest on borrowed cash (leveraged longs)
    maintenance_margin_pct: float = 50.0  # paper: liquidation when equity < this % of used margin


class KrakenExecCfg(_Model):
    entry_timeout_seconds: int = 1800
    exit_limit_timeout_seconds: int = 60
    paper_slippage_bps: float = 5
    validate_orders_in_test: bool = True


class KrakenCfg(_Model):
    quote_currency: str = "EUR"
    leverage: LeverageCfg = LeverageCfg()
    financing: FinancingCfg = FinancingCfg(open_fee_bps=2.0, rollover_bps_per_4h=2.0)
    fee_tier: Literal["starter", "intermediate", "pro"] = "starter"
    scanner: KrakenScannerCfg = KrakenScannerCfg()
    bars: KrakenBarsCfg = KrakenBarsCfg()
    agents: KrakenAgentsCfg = KrakenAgentsCfg()
    execution: KrakenExecCfg = KrakenExecCfg()


class GatewayCfg(_Model):
    host: str = "127.0.0.1"
    paper_port: int = 4002
    live_port: int = 4001
    client_id: int = 17
    connect_timeout_seconds: float = 15


class IBKRScannerCfg(_Model):
    max_spread_bps: float = 50
    min_avg_daily_volume: float = 500_000
    avoid_open_close_minutes: int = 15
    avoid_earnings_days: bool = True


class IBKRBarsCfg(_Model):
    bar_size: str = "1 day"
    duration: str = "1 Y"
    intraday_bar_size: str = "15 mins"
    intraday_duration: str = "5 D"


class PairsCfg(_Model):
    enabled: bool = True
    lookback: int = 60
    z_entry: float = 2.0


class SmartMoneyIBKRCfg(_Model):
    enabled: bool = True
    window_days: int = 14
    cluster_min_insiders: int = 3
    min_buy_value: float = 100_000
    heavy_sell_value: float = 2_000_000
    heavy_sell_min_insiders: int = 3
    ignore_planned_sales: bool = True
    institutions_13f: list[str] = []


class IBKRAgentsCfg(_Model):
    arbitrage: PairsCfg = PairsCfg()
    convergence: ConvergenceCfg = ConvergenceCfg(reference="sma", window=20, volume_window=20, volume_mult=1.2)
    smart_money: SmartMoneyIBKRCfg = SmartMoneyIBKRCfg()


class IBKRFeesCfg(_Model):
    model: Literal["fixed", "tiered"] = "fixed"
    us_per_share: float = 0.005
    us_min_per_order: float = 1.0
    us_max_pct: float = 1.0
    eu_pct: float = 0.05
    eu_min_per_order: float = 3.0


class IBKRExecCfg(_Model):
    entry_timeout_seconds: int = 1800
    exit_limit_timeout_seconds: int = 300


class IBKRCfg(_Model):
    base_currency: str = "EUR"
    leverage: LeverageCfg = LeverageCfg(target_daily_vol_pct=1.5, vol_lookback_bars=20)
    financing: FinancingCfg = FinancingCfg(borrow_fee_pct_year=3.0, margin_interest_pct_year=6.0)
    data_delay_minutes: int = 15
    gateway: GatewayCfg = GatewayCfg()
    scanner: IBKRScannerCfg = IBKRScannerCfg()
    bars: IBKRBarsCfg = IBKRBarsCfg()
    agents: IBKRAgentsCfg = IBKRAgentsCfg()
    fees: IBKRFeesCfg = IBKRFeesCfg()
    fx_fallback_to_eur: dict[str, float] = {"USD": 0.92}
    execution: IBKRExecCfg = IBKRExecCfg()


class ConsensusCfg(_Model):
    full_size_min_long: int = 2
    half_size_factor: float = 0.5
    # agents allowed to open a half-size trade on their own; the others only confirm or block
    solo_agents: list[str] = ["arbitrage", "convergence"]


class VolumeSpikeCfg(_Model):
    bars: int = 3
    mult: float = 3.0
    stall_pct: float = 0.3
    only_in_profit: bool = True  # protect gains; losing trades are handled by the stop


class TrailingCfg(_Model):
    """Stop moved to break-even (fees included) at +N R, then trailed N ATR behind the price."""

    enabled: bool = True
    breakeven_at_r: float = 1.0
    trail_atr_mult: float = 2.0


class TradePlanCfg(_Model):
    """Entry filter: the trade must pay at least ``min_reward_risk`` times what it risks, fees included."""

    min_reward_risk: float = 1.5
    atr_period: int = 14
    stop_atr_mult: float = 2.5  # stop distance = ATR x mult, within [min_stop_pct, risk.yaml stop_loss_pct]
    min_stop_pct: float = 0.5
    default_target_atr_mult: float = 8.0  # take-profit distance (ATR) when the agent gives no target

class ExitsCfg(_Model):
    take_profit_fraction: float = 0.85
    volume_spike: VolumeSpikeCfg = VolumeSpikeCfg()
    trailing: TrailingCfg = TrailingCfg()
    max_holding_hours: dict[str, float] = {"kraken": 72, "ibkr": 240}


class WalkForwardCfg(_Model):
    folds: int = 4
    train_fraction: float = 0.7
    grid: dict[str, list[float]] = {}


class BacktestCfg(_Model):
    spread_bps: float = 10
    slippage_bps: float = 5
    walk_forward: WalkForwardCfg = WalkForwardCfg()


class DataCfg(_Model):
    etherscan_min_interval_seconds: float = 0.4
    edgar_min_interval_seconds: float = 0.15
    amf_min_interval_seconds: float = 0.5
    amf_api: str = "https://bdif.amf-france.org/back/api/v1"


class StrategyConfig(_Model):
    cycle_seconds: dict[str, float] = {"kraken": 60, "ibkr": 300}
    trade_plan: TradePlanCfg = TradePlanCfg()
    paper_starting_balance_eur: dict[str, float] = {"kraken": 1000, "ibkr": 1000}
    consensus: ConsensusCfg = ConsensusCfg()
    kraken: KrakenCfg = KrakenCfg()
    ibkr: IBKRCfg = IBKRCfg()
    exits: ExitsCfg = ExitsCfg()
    backtest: BacktestCfg = BacktestCfg()
    data: DataCfg = DataCfg()


# --------------------------------------------------------------------------- risk


class BrokerRiskCfg(_Model):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    max_position_pct_full: float = Field(5.0, gt=0, le=100)
    max_position_pct_half: float = Field(2.5, gt=0, le=100)
    max_open_positions: int = Field(5, ge=0)
    max_exposure_pct: float = Field(60.0, ge=0, le=1000)  # gross notional (longs + shorts) / equity
    max_leverage: float = Field(2.0, ge=1, le=10)  # hard cap on account leverage per position
    allow_short: bool = True
    stop_loss_pct: float = Field(3.0, gt=0, lt=100)
    daily_loss_limit_pct: float = Field(3.0, gt=0, le=100)
    max_drawdown_pct: float = Field(15.0, gt=0, le=100)
    max_orders_per_minute: int = Field(10, ge=1)
    live_capital_cap_eur: float | None = Field(None, gt=0)


class RiskConfig(_Model):
    kraken: BrokerRiskCfg = BrokerRiskCfg()
    ibkr: BrokerRiskCfg = BrokerRiskCfg()

    def for_broker(self, broker: str) -> BrokerRiskCfg:
        return getattr(self, str(broker))


# --------------------------------------------------------------------------- universe / labels


class UniverseEntry(_Model):
    symbol: str
    exchange: str = "SMART"
    currency: str = "USD"
    primary_exchange: str | None = None
    isin: str | None = None
    cusip: str | None = None
    amf_jeton: str | None = None
    earnings_dates: list[str] = []


class UniverseIBKR(_Model):
    instruments: list[UniverseEntry] = []
    pairs: list[tuple[str, str]] = []

    def entry(self, symbol: str) -> UniverseEntry | None:
        return next((i for i in self.instruments if i.symbol == symbol), None)


class WalletLabel(_Model):
    address: str
    exchange: str


class WalletLabels(_Model):
    wallets: dict[str, list[WalletLabel]] = {}

    def addresses(self, chain: str) -> list[WalletLabel]:
        return self.wallets.get(chain, [])


# --------------------------------------------------------------------------- bundle


class AppConfig(BaseModel):
    strategy: StrategyConfig
    risk: RiskConfig
    universe_ibkr: UniverseIBKR
    wallet_labels: WalletLabels


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def load_config(directory: Path | None = None) -> AppConfig:
    d = directory or config_dir()
    return AppConfig(
        strategy=StrategyConfig.model_validate(_load_yaml(d / "strategy.yaml")),
        risk=RiskConfig.model_validate(_load_yaml(d / "risk.yaml")),
        universe_ibkr=UniverseIBKR.model_validate(_load_yaml(d / "universe_ibkr.yaml")),
        wallet_labels=WalletLabels.model_validate(_load_yaml(d / "wallet_labels.yaml")),
    )


# --------------------------------------------------------------------------- secrets


class Secrets(BaseModel):
    kraken_api_key: SecretStr | None = None
    kraken_api_secret: SecretStr | None = None
    etherscan_api_key: SecretStr | None = None
    edgar_user_agent: str | None = None
    ibkr_live_account: str | None = None

    @classmethod
    def load(cls, env_file: Path | None = None) -> "Secrets":
        """Read secrets from the process environment, then the local .env file."""
        path = env_file or (home_dir() / ".env")
        file_vals = dotenv_values(path) if path.exists() else {}

        def get(name: str) -> str | None:
            val = os.environ.get(name) or file_vals.get(name)
            return val.strip() if val and val.strip() else None

        def secret(name: str) -> SecretStr | None:
            v = get(name)
            return SecretStr(v) if v else None

        return cls(
            kraken_api_key=secret("KRAKEN_API_KEY"),
            kraken_api_secret=secret("KRAKEN_API_SECRET"),
            etherscan_api_key=secret("ETHERSCAN_API_KEY"),
            edgar_user_agent=get("EDGAR_USER_AGENT"),
            ibkr_live_account=get("IBKR_LIVE_ACCOUNT"),
        )

    @property
    def has_kraken_keys(self) -> bool:
        return bool(self.kraken_api_key and self.kraken_api_secret)

    def secret_values(self) -> list[str]:
        """Every value that must never appear in logs or UI."""
        out = []
        for s in (self.kraken_api_key, self.kraken_api_secret, self.etherscan_api_key):
            if s is not None and s.get_secret_value():
                out.append(s.get_secret_value())
        return out

    def __repr__(self) -> str:  # never leak in tracebacks
        return "Secrets(***)"

    __str__ = __repr__
