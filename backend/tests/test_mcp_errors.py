from __future__ import annotations

import httpx
import pytest

from app.rails.mcp import McpError, McpSession, bind_capabilities


def test_mcp_timeout():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("mcp timed out")

    session = McpSession("https://example.invalid/mcp", "token")
    client = httpx.Client(transport=httpx.MockTransport(handler))
    with pytest.raises(McpError) as exc:
        session._post(client, {"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert exc.value.error_class == "TIMEOUT"


def test_mcp_connection_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")

    session = McpSession("https://example.invalid/mcp", "token")
    client = httpx.Client(transport=httpx.MockTransport(handler))
    with pytest.raises(McpError) as exc:
        session._post(client, {"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert exc.value.error_class == "CONNECTION_FAILURE"


def test_mcp_missing_tool_on_call():
    session = McpSession("https://example.invalid/mcp", "token")
    client = httpx.Client()
    with pytest.raises(McpError) as exc:
        session.call(client, "spot.newOrder", {"symbol": "ARKUSDT"})
    assert exc.value.error_class == "MISSING_TOOL"


def test_schema_change_unknown_order_tool_not_bound():
    tools = {"spot.createOrder": {"name": "spot.createOrder", "description": "place an order"}}
    caps = bind_capabilities(tools)
    assert "CAP_NEW_SPOT_ORDER" not in caps
