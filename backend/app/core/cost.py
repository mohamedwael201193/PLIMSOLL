from __future__ import annotations

from decimal import Decimal

from app.core.book import mid_price
from app.core.schemas import BookLevel, Constitution, MarketSnapshot


def walk_quote(
    levels: list[BookLevel],
    quote_notional: Decimal,
) -> tuple[Decimal, Decimal]:
    """Consume levels until quote_notional filled. Returns (base_qty, quote_spent)."""
    remaining = quote_notional
    base = Decimal("0")
    quote = Decimal("0")
    if remaining <= 0:
        return Decimal("0"), Decimal("0")
    for lvl in levels:
        if lvl.price <= 0 or lvl.quantity <= 0:
            continue
        level_quote = lvl.price * lvl.quantity
        take_quote = level_quote if level_quote <= remaining else remaining
        take_base = take_quote / lvl.price
        base += take_base
        quote += take_quote
        remaining -= take_quote
        if remaining <= 0:
            break
    return base, quote


def sell_vwap_and_cost_bps(
    snapshot: MarketSnapshot,
    quote_notional: Decimal,
    constitution: Constitution,
) -> tuple[Decimal | None, Decimal | None, bool]:
    """Exit a long via bids. Returns (vwap, all_in_cost_bps, exhausted)."""
    if quote_notional <= 0:
        return None, None, False
    base, quote = walk_quote(snapshot.bids, quote_notional)
    exhausted = quote + Decimal("1e-12") < quote_notional
    if base <= 0 or quote <= 0:
        return None, None, True
    vwap = quote / base
    mid = mid_price(snapshot)
    if mid is None or mid <= 0:
        return vwap, None, exhausted
    # Sell: worse than mid when vwap < mid. Fee always paid as taker.
    impact_bps = ((mid - vwap) / mid) * Decimal("10000")
    all_in = impact_bps + constitution.taker_fee_bps
    return vwap, all_in, exhausted
