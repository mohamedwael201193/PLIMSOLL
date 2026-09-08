from __future__ import annotations

from app.rails.mcp import bind_capabilities, is_write_tool


def test_bind_from_live_shaped_inventory():
    tools = {
        "spot.depth": {"name": "spot.depth", "description": "order book"},
        "spot.getAccount": {"name": "spot.getAccount", "description": "account"},
        "spot.getOrder": {"name": "spot.getOrder", "description": "get order"},
        "spot.getOpenOrders": {"name": "spot.getOpenOrders", "description": "open"},
        "spot.newOrder": {"name": "spot.newOrder", "description": "new order WRITE"},
        "spot.ticker24hr": {"name": "spot.ticker24hr", "description": "ticker"},
        "wallet.queryUserWalletBalance": {"name": "wallet.queryUserWalletBalance", "description": "wallet"},
    }
    caps = bind_capabilities(tools)
    assert caps["CAP_ACCOUNT"] == "spot.getAccount"
    assert caps["CAP_NEW_SPOT_ORDER"] == "spot.newOrder"
    assert caps["CAP_GET_ORDER"] == "spot.getOrder"
    assert caps["CAP_OPEN_ORDERS"] == "spot.getOpenOrders"
    assert caps["CAP_MARKET_DEPTH"] == "spot.depth"
    assert is_write_tool("spot.newOrder", tools["spot.newOrder"])


def test_missing_write_fails_closed():
    tools = {"spot.getAccount": {"name": "spot.getAccount", "description": "account"}}
    caps = bind_capabilities(tools)
    assert "CAP_NEW_SPOT_ORDER" not in caps
    assert caps["CAP_ACCOUNT"] == "spot.getAccount"
