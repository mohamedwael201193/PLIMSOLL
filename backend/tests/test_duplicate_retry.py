from __future__ import annotations

from app.agent.execute import place_spot_market
from app.core.hashing import client_order_id
from app.core.schemas import LegalOrder
from app.rails.mcp import McpError
from decimal import Decimal


class FakeSession:
    def __init__(self, existing: dict | None = None, fail_get: bool = False):
        self.capabilities = {"CAP_GET_ORDER": "spot.getOrder"}
        self.tools = {"spot.newOrder": {"name": "spot.newOrder"}, "spot.getOrder": {"name": "spot.getOrder"}}
        self.existing = existing
        self.fail_get = fail_get
        self.calls: list[tuple[str, dict]] = []

    def call(self, client, name, arguments, rpc_id=99):
        self.calls.append((name, arguments))
        if name == "spot.getOrder":
            if self.fail_get:
                raise McpError("NOT_FOUND", "no order")
            if self.existing:
                return self.existing
            raise McpError("NOT_FOUND", "no order")
        if name == "spot.newOrder":
            return {
                "orderId": 99,
                "clientOrderId": arguments.get("newClientOrderId"),
                "status": "FILLED",
                "executedQty": "1",
                "origQty": "1",
                "cummulativeQuoteQty": "5",
            }
        raise McpError("MISSING_TOOL", name)


def test_duplicate_retry_does_not_submit_second_new_order():
    cid = client_order_id("intent-dup", 0)
    session = FakeSession(
        existing={
            "orderId": 7,
            "clientOrderId": cid,
            "status": "FILLED",
            "executedQty": "1",
            "origQty": "1",
        }
    )
    order = LegalOrder(symbol="ARKUSDT", side="BUY", notional=Decimal("5"), quote_order_qty=Decimal("5"))
    first = place_spot_market(
        session,  # type: ignore[arg-type]
        None,  # type: ignore[arg-type]
        cap_new="spot.newOrder",
        order=order,
        intent_id="intent-dup",
        slice_index=0,
        confirm="CONFIRM",
        writes_enabled=True,
    )
    second = place_spot_market(
        session,  # type: ignore[arg-type]
        None,  # type: ignore[arg-type]
        cap_new="spot.newOrder",
        order=order,
        intent_id="intent-dup",
        slice_index=0,
        confirm="CONFIRM",
        writes_enabled=True,
    )
    new_order_calls = [c for c in session.calls if c[0] == "spot.newOrder"]
    assert first["duplicate_suppressed"] is True
    assert second["duplicate_suppressed"] is True
    assert new_order_calls == []
    assert first["client_order_id"] == cid == second["client_order_id"]


def test_first_submit_when_no_existing_order():
    session = FakeSession(existing=None, fail_get=True)
    order = LegalOrder(symbol="ARKUSDT", side="BUY", notional=Decimal("5"), quote_order_qty=Decimal("5"))
    placed = place_spot_market(
        session,  # type: ignore[arg-type]
        None,  # type: ignore[arg-type]
        cap_new="spot.newOrder",
        order=order,
        intent_id="intent-new",
        slice_index=0,
        confirm="CONFIRM",
        writes_enabled=True,
    )
    assert placed["duplicate_suppressed"] is False
    assert any(c[0] == "spot.newOrder" for c in session.calls)
