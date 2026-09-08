from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.core.hashing import client_order_id
from app.core.residual import is_partial
from app.core.schemas import FillReport, LegalOrder
from app.rails.mcp import McpError, McpSession
import httpx


def parse_order_payload(payload: Any) -> FillReport:
    data = payload
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
        data = payload["data"]
    if not isinstance(data, dict):
        return FillReport(
            classification="UNKNOWN",
            client_order_id="",
            status="UNPARSEABLE",
            raw_keys=[],
        )
    executed = Decimal(str(data.get("executedQty") or "0"))
    orig = data.get("origQty")
    quote_raw = (
        data.get("cummulativeQuoteQty")
        or data.get("cumulativeQuoteQty")
        or data.get("cumQuote")
        or "0"
    )
    quote = Decimal(str(quote_raw))
    cid = str(data.get("clientOrderId") or data.get("origClientOrderId") or "")
    oid = str(data.get("orderId") or "") or None
    status = str(data.get("status") or "UNKNOWN")
    orig_qty = Decimal(str(orig)) if orig is not None else None
    fill = FillReport(
        classification="LIVE",
        client_order_id=cid,
        order_id=oid,
        status=status,
        executed_qty=executed,
        orig_qty=orig_qty,
        requested_qty=orig_qty,
        requested_quote=Decimal(str(data["origQuoteOrderQty"])) if data.get("origQuoteOrderQty") else None,
        cummulative_quote_qty=quote,
        commission=Decimal(str(data["commission"])) if "commission" in data else None,
        raw_keys=sorted(data.keys()),
    )
    fill.partial = is_partial(fill)
    return fill


def place_spot_market(
    session: McpSession,
    client: httpx.Client,
    *,
    cap_new: str,
    order: LegalOrder,
    intent_id: str,
    slice_index: int,
    confirm: str,
    writes_enabled: bool,
) -> dict[str, Any]:
    if confirm != "CONFIRM":
        raise McpError("CONFIRM_REQUIRED", "explicit CONFIRM required")
    if not writes_enabled:
        raise McpError("WRITES_DISABLED", "writes_enabled=false")
    cid = client_order_id(intent_id, slice_index)
    cap_get = session.capabilities.get("CAP_GET_ORDER")
    if cap_get:
        try:
            existing = session.call(
                client,
                cap_get,
                {"symbol": order.symbol, "origClientOrderId": cid},
            )
            if isinstance(existing, dict) and (existing.get("orderId") or existing.get("status")):
                return {"client_order_id": cid, "result": existing, "duplicate_suppressed": True}
        except McpError:
            pass
    args: dict[str, Any] = {
        "symbol": order.symbol,
        "side": order.side,
        "type": "MARKET",
        "newClientOrderId": cid,
        "newOrderRespType": "FULL",
    }
    if order.quote_order_qty is not None:
        args["quoteOrderQty"] = str(order.quote_order_qty)
    elif order.quantity is not None:
        args["quantity"] = str(order.quantity)
    else:
        raise McpError("ILLEGAL_ORDER", "no quantity")
    return {"client_order_id": cid, "result": session.call(client, cap_new, args), "duplicate_suppressed": False}
