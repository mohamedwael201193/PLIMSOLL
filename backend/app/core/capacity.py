from __future__ import annotations

from decimal import Decimal, ROUND_DOWN

from app.core.book import is_crossed, mid_price, visible_notional
from app.core.cost import sell_vwap_and_cost_bps
from app.core.schemas import Binding, CapacityResult, Constitution, MarketSnapshot


def _stale(snapshot: MarketSnapshot, constitution: Constitution, now_ts: float) -> bool:
    age_ms = (now_ts - snapshot.captured_at.timestamp()) * 1000
    return age_ms > constitution.stale_timeout_ms


def _cost_capacity(snapshot: MarketSnapshot, constitution: Constitution) -> Decimal:
    visible = visible_notional(snapshot.bids)
    if visible <= 0:
        return Decimal("0")
    lo = Decimal("0")
    hi = visible
    best = Decimal("0")
    budget = constitution.max_exit_cost_bps
    for _ in range(64):
        mid = (lo + hi) / Decimal("2")
        if mid <= 0:
            break
        _, cost, exhausted = sell_vwap_and_cost_bps(snapshot, mid, constitution)
        if cost is None or exhausted or cost > budget:
            hi = mid
        else:
            best = mid
            lo = mid
        if hi - lo < Decimal("0.00000001"):
            break
    return best.quantize(Decimal("0.01"), rounding=ROUND_DOWN)


def estimate_exit_capacity(
    snapshot: MarketSnapshot,
    constitution: Constitution,
    *,
    now_ts: float | None = None,
) -> CapacityResult:
    warnings: list[str] = []
    if now_ts is None:
        now_ts = snapshot.captured_at.timestamp()
    if _stale(snapshot, constitution, now_ts):
        warnings.append("STALE_SNAPSHOT")
    if is_crossed(snapshot):
        warnings.append("CROSSED_BOOK")
    if not snapshot.bids:
        warnings.append("EMPTY_OR_ONE_SIDED_BIDS")
    if not snapshot.asks:
        warnings.append("EMPTY_OR_ONE_SIDED_ASKS")
    if snapshot.quote_volume_24h <= 0:
        warnings.append("ZERO_ADV")
    mid = mid_price(snapshot)
    if mid is not None and snapshot.last_price > 0 and mid != 0:
        if abs(snapshot.last_price - mid) / mid > Decimal("0.02"):
            warnings.append("LAST_NE_MID")

    cost_cap = _cost_capacity(snapshot, constitution)
    time_cap = (
        constitution.max_participation
        * snapshot.quote_volume_24h
        * constitution.max_exit_horizon_days
    )
    if time_cap < 0:
        time_cap = Decimal("0")
    visible = visible_notional(snapshot.bids)
    frac_cap = visible * constitution.max_fraction_of_visible_book

    candidates = [
        (cost_cap, Binding.COST),
        (time_cap, Binding.TIME),
        (frac_cap, Binding.BOOK_FRACTION),
    ]
    estimated, binding = min(candidates, key=lambda x: x[0])
    if estimated <= 0:
        estimated = Decimal("0")
        binding = Binding.ZERO

    ratio = None
    if cost_cap > 0 and time_cap > 0:
        ratio = max(cost_cap, time_cap) / min(cost_cap, time_cap)
    confidence: str
    if "STALE_SNAPSHOT" in warnings or "CROSSED_BOOK" in warnings or estimated <= 0:
        confidence = "LOW"
    elif ratio is not None and ratio <= Decimal("2"):
        confidence = "HIGH"
    else:
        confidence = "MED"

    assumptions = {
        "max_exit_cost_bps": str(constitution.max_exit_cost_bps),
        "max_exit_horizon_days": str(constitution.max_exit_horizon_days),
        "max_participation": str(constitution.max_participation),
        "max_fraction_of_visible_book": str(constitution.max_fraction_of_visible_book),
        "taker_fee_bps": str(constitution.taker_fee_bps),
        "exit_side": "SELL_INTO_BIDS",
        "language": "estimated exit capacity under stated constraints",
        "not": ["maximum safe size", "guaranteed exit", "guaranteed liquidity"],
    }
    return CapacityResult(
        symbol=snapshot.symbol,
        classification=snapshot.classification,
        cost_capacity_notional=cost_cap,
        time_capacity_notional=time_cap,
        visible_exit_book_notional=visible,
        fraction_applied=constitution.max_fraction_of_visible_book,
        estimated_exit_capacity_notional=estimated,
        binding=binding,
        confidence=confidence,  # type: ignore[arg-type]
        assumptions=assumptions,
        warnings=warnings,
        snapshot_hash=snapshot.snapshot_hash,
        captured_at=snapshot.captured_at,
    )
