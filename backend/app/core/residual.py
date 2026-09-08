from __future__ import annotations

from decimal import Decimal

from app.core.schemas import FillReport


def is_partial(fill: FillReport) -> bool:
    if fill.partial:
        return True
    if fill.requested_qty is not None and fill.executed_qty < fill.requested_qty:
        return True
    if (
        fill.requested_quote is not None
        and fill.cummulative_quote_qty + Decimal("0.01") < fill.requested_quote
        and fill.status not in {"FILLED", "filled"}
    ):
        return True
    if fill.status in {"PARTIALLY_FILLED", "NEW", "PENDING"}:
        return True
    return False


def remaining_qty(fill: FillReport) -> Decimal:
    if fill.requested_qty is None:
        return Decimal("0")
    rem = fill.requested_qty - fill.executed_qty
    return rem if rem > 0 else Decimal("0")
