from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Classification = Literal["LIVE", "REPLAY", "PAPER", "TESTNET", "SIMULATED", "UNKNOWN"]


class Binding(str, Enum):
    COST = "COST"
    TIME = "TIME"
    BOOK_FRACTION = "BOOK_FRACTION"
    FILTER = "FILTER"
    ZERO = "ZERO"


class Action(str, Enum):
    FILL_AS_ASKED = "FILL_AS_ASKED"
    SIZE_DOWN = "SIZE_DOWN"
    STAGE = "STAGE"
    REFUSE = "REFUSE"
    TRIM_HELD = "TRIM_HELD"
    WAIT = "WAIT"
    ASK = "ASK"


class AgentState(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    OVER_CAPACITY = "OVER_CAPACITY"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    EXECUTING = "EXECUTING"
    PARTIAL_FILL = "PARTIAL_FILL"
    REASSESSING = "REASSESSING"
    DEGRADED = "DEGRADED"
    HALTED = "HALTED"


class Constitution(BaseModel):
    max_exit_cost_bps: Decimal = Decimal("50")
    max_exit_horizon_days: Decimal = Decimal("1")
    max_participation: Decimal = Decimal("0.10")
    max_fraction_of_visible_book: Decimal = Decimal("0.5")
    stale_timeout_ms: int = 5000
    never_increase_if_capacity_falling: bool = True
    taker_fee_bps: Decimal = Decimal("10")
    max_order_notional: Decimal | None = None

    @field_validator(
        "max_exit_cost_bps",
        "max_exit_horizon_days",
        "max_participation",
        "max_fraction_of_visible_book",
        "taker_fee_bps",
        mode="before",
    )
    @classmethod
    def _dec(cls, v: Any) -> Decimal:
        return Decimal(str(v))


class BookLevel(BaseModel):
    price: Decimal
    quantity: Decimal

    @field_validator("price", "quantity", mode="before")
    @classmethod
    def _dec(cls, v: Any) -> Decimal:
        return Decimal(str(v))


class SymbolFilters(BaseModel):
    tick_size: Decimal = Decimal("0.0001")
    lot_min: Decimal = Decimal("0")
    lot_max: Decimal = Decimal("1e18")
    lot_step: Decimal = Decimal("0.00000001")
    market_lot_min: Decimal = Decimal("0")
    market_lot_max: Decimal = Decimal("1e18")
    market_lot_step: Decimal = Decimal("0.00000001")
    min_notional: Decimal = Decimal("0")
    max_notional: Decimal | None = None
    apply_min_to_market: bool = True
    apply_max_to_market: bool = False
    base_asset: str = ""
    quote_asset: str = "USDT"

    @field_validator(
        "tick_size",
        "lot_min",
        "lot_max",
        "lot_step",
        "market_lot_min",
        "market_lot_max",
        "market_lot_step",
        "min_notional",
        mode="before",
    )
    @classmethod
    def _dec(cls, v: Any) -> Decimal:
        return Decimal(str(v))


class MarketSnapshot(BaseModel):
    symbol: str
    captured_at: datetime
    classification: Classification
    source: str
    bids: list[BookLevel]
    asks: list[BookLevel]
    quote_volume_24h: Decimal
    last_price: Decimal
    filters: SymbolFilters
    snapshot_hash: str = ""

    @field_validator("quote_volume_24h", "last_price", mode="before")
    @classmethod
    def _dec(cls, v: Any) -> Decimal:
        return Decimal(str(v))


class Position(BaseModel):
    symbol: str
    base_qty: Decimal = Decimal("0")
    avg_price: Decimal | None = None

    @field_validator("base_qty", mode="before")
    @classmethod
    def _dec(cls, v: Any) -> Decimal:
        return Decimal(str(v))


class Intent(BaseModel):
    raw_text: str
    symbol: str | None = None
    target_notional: Decimal | None = None
    side_hint: Literal["BUY", "SELL", "HOLD"] | None = None
    constitution_overrides: dict[str, Any] = Field(default_factory=dict)
    held_notional: Decimal | None = None
    needs_clarification: bool = False
    clarification: str | None = None
    parse_notes: list[str] = Field(default_factory=list)


class CapacityResult(BaseModel):
    symbol: str
    classification: Classification
    cost_capacity_notional: Decimal
    time_capacity_notional: Decimal
    visible_exit_book_notional: Decimal
    fraction_applied: Decimal
    estimated_exit_capacity_notional: Decimal
    binding: Binding
    confidence: Literal["HIGH", "MED", "LOW"]
    assumptions: dict[str, Any]
    warnings: list[str] = Field(default_factory=list)
    snapshot_hash: str
    captured_at: datetime


class LegalOrder(BaseModel):
    symbol: str
    side: Literal["BUY", "SELL"]
    type: Literal["MARKET", "LIMIT"] = "MARKET"
    quantity: Decimal | None = None
    quote_order_qty: Decimal | None = None
    notional: Decimal
    clipped: bool = False
    clip_reasons: list[str] = Field(default_factory=list)


class Decision(BaseModel):
    action: Action
    state: AgentState
    intent: Intent
    capacity: CapacityResult
    requested_notional: Decimal | None = None
    legal_order: LegalOrder | None = None
    reason: str
    over_capacity: bool = False
    held_notional: Decimal | None = None


class Approval(BaseModel):
    approval_id: str
    decision_id: str
    snapshot_hash: str
    expires_at: datetime
    confirmation_token: str
    status: Literal["PENDING", "USED", "EXPIRED", "VOID"] = "PENDING"
    writes_enabled_required: bool = True


class FillReport(BaseModel):
    classification: Classification
    client_order_id: str
    order_id: str | None = None
    status: str
    executed_qty: Decimal = Decimal("0")
    orig_qty: Decimal | None = None
    cummulative_quote_qty: Decimal = Decimal("0")
    requested_qty: Decimal | None = None
    requested_quote: Decimal | None = None
    partial: bool = False
    commission: Decimal | None = None
    raw_keys: list[str] = Field(default_factory=list)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
