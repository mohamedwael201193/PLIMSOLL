from __future__ import annotations

from decimal import Decimal, ROUND_DOWN, ROUND_FLOOR

from app.core.schemas import LegalOrder, SymbolFilters


def _decimals(step: Decimal) -> int:
    s = format(step, "f")
    if "." in s:
        return len(s.rstrip("0").split(".")[1])
    return 0


def floor_to_step(value: Decimal, step: Decimal) -> Decimal:
    if step <= 0:
        return value
    n = (value / step).to_integral_value(rounding=ROUND_FLOOR)
    return n * step


def legalize_market(
    *,
    symbol: str,
    side: str,
    quote_notional: Decimal,
    ref_price: Decimal,
    filters: SymbolFilters,
) -> LegalOrder:
    reasons: list[str] = []
    clipped = False
    notional = quote_notional
    if notional < 0:
        notional = Decimal("0")
        reasons.append("NEGATIVE")
        clipped = True

    if filters.apply_max_to_market and filters.max_notional is not None and notional > filters.max_notional:
        notional = filters.max_notional
        reasons.append("MAX_NOTIONAL")
        clipped = True

    qty = Decimal("0")
    if ref_price > 0:
        qty = notional / ref_price
    qty = floor_to_step(qty, filters.market_lot_step)
    if qty < filters.market_lot_min:
        reasons.append("MARKET_LOT_MIN")
        clipped = True
        qty = Decimal("0")
    if qty > filters.market_lot_max:
        qty = floor_to_step(filters.market_lot_max, filters.market_lot_step)
        reasons.append("MARKET_LOT_MAX")
        clipped = True

    est_notional = qty * ref_price if ref_price > 0 else Decimal("0")
    if filters.apply_min_to_market and est_notional < filters.min_notional:
        reasons.append("MIN_NOTIONAL")
        clipped = True
        qty = Decimal("0")
        est_notional = Decimal("0")

    quote = None
    quantity = qty
    # Prefer quoteOrderQty on BUY when we still have a legal notional after qty clip.
    if side == "BUY" and est_notional > 0:
        quote = floor_to_step(est_notional, Decimal("0.01"))
        if filters.apply_min_to_market and quote < filters.min_notional:
            quote = Decimal("0")
            quantity = Decimal("0")
            est_notional = Decimal("0")
            reasons.append("QUOTE_MIN_NOTIONAL")
            clipped = True

    return LegalOrder(
        symbol=symbol,
        side=side,  # type: ignore[arg-type]
        type="MARKET",
        quantity=quantity if quote is None else None,
        quote_order_qty=quote,
        notional=est_notional.quantize(Decimal("0.01"), rounding=ROUND_DOWN),
        clipped=clipped,
        clip_reasons=reasons,
    )
