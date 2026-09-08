from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.core.residual import is_partial, remaining_qty
from app.core.schemas import FillReport


def redact_account(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {"ok": False, "error_class": "UNPARSEABLE_ACCOUNT"}
    bals = payload.get("balances")
    nonzero = 0
    assets: list[str] = []
    if isinstance(bals, list):
        for row in bals:
            if not isinstance(row, dict):
                continue
            free = Decimal(str(row.get("free") or "0"))
            locked = Decimal(str(row.get("locked") or "0"))
            if free + locked > 0:
                nonzero += 1
                asset = str(row.get("asset") or "")
                if asset:
                    assets.append(asset)
    return {
        "ok": True,
        "accountType": payload.get("accountType"),
        "canTrade": payload.get("canTrade"),
        "nonzero_assets": nonzero,
        "assets": assets,
    }


def reconcile(
    fill: FillReport,
    *,
    requested_qty: Decimal | None = None,
    requested_quote: Decimal | None = None,
) -> dict[str, Any]:
    if requested_qty is not None:
        fill.requested_qty = requested_qty
    if requested_quote is not None:
        fill.requested_quote = requested_quote
    fill.partial = is_partial(fill)
    remaining = remaining_qty(fill)
    success = (
        not fill.partial
        and fill.status.upper() in {"FILLED", "EXPIRED"}
        and fill.executed_qty > 0
    )
    if fill.status.upper() == "EXPIRED" and fill.executed_qty <= 0:
        success = False
    return {
        "classification": fill.classification,
        "success": success,
        "partial": fill.partial,
        "status": fill.status,
        "executed_qty": str(fill.executed_qty),
        "remaining_qty": str(remaining),
        "cummulative_quote_qty": str(fill.cummulative_quote_qty),
        "order_id_present": bool(fill.order_id),
        "client_order_id": fill.client_order_id,
        "requires_fresh_approval": fill.partial,
    }
