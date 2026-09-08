from __future__ import annotations

from decimal import Decimal

import pytest

from app.agent.execute import parse_order_payload, place_spot_market
from app.core.schemas import LegalOrder
from app.rails.mcp import McpError, McpSession


def test_parse_full_fill_live_shape():
    fill = parse_order_payload(
        {
            "symbol": "ARKUSDT",
            "orderId": 123,
            "clientOrderId": "plim_abc",
            "status": "FILLED",
            "executedQty": "10",
            "origQty": "10",
            "cummulativeQuoteQty": "10.5",
        }
    )
    assert fill.classification == "LIVE"
    assert fill.partial is False
    assert fill.executed_qty == Decimal("10")
    assert fill.cummulative_quote_qty == Decimal("10.5")


def test_parse_partial():
    fill = parse_order_payload(
        {
            "orderId": 1,
            "clientOrderId": "plim_p",
            "status": "PARTIALLY_FILLED",
            "executedQty": "1",
            "origQty": "5",
            "cumulativeQuoteQty": "1.1",
        }
    )
    assert fill.partial is True


def test_place_requires_confirm():
    session = McpSession("https://example.invalid", "token")
    session.tools["spot.newOrder"] = {"name": "spot.newOrder"}
    order = LegalOrder(symbol="ARKUSDT", side="BUY", notional=Decimal("5"), quote_order_qty=Decimal("5"))
    with pytest.raises(McpError) as exc:
        place_spot_market(
            session,
            None,  # type: ignore[arg-type]
            cap_new="spot.newOrder",
            order=order,
            intent_id="i",
            slice_index=0,
            confirm="no",
            writes_enabled=True,
        )
    assert exc.value.error_class == "CONFIRM_REQUIRED"


def test_place_writes_disabled():
    session = McpSession("https://example.invalid", "token")
    order = LegalOrder(symbol="ARKUSDT", side="BUY", notional=Decimal("5"), quote_order_qty=Decimal("5"))
    with pytest.raises(McpError) as exc:
        place_spot_market(
            session,
            None,  # type: ignore[arg-type]
            cap_new="spot.newOrder",
            order=order,
            intent_id="i",
            slice_index=0,
            confirm="CONFIRM",
            writes_enabled=False,
        )
    assert exc.value.error_class == "WRITES_DISABLED"
