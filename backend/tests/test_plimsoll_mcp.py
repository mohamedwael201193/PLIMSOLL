from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import snapshot

client = TestClient(app)


def test_mcp_initialize_and_list_has_no_execute():
    init = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "unit", "version": "0"},
            },
        },
    )
    assert init.status_code == 200
    assert init.json()["result"]["serverInfo"]["name"] == "plimsoll"
    listed = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    names = [t["name"] for t in listed.json()["result"]["tools"]]
    assert "plimsoll.capacity" in names
    assert "plimsoll.intent" in names
    assert "plimsoll.account" in names
    assert not any("execute" in n.lower() for n in names)


def test_mcp_account_disconnected_mentions_allowlist():
    r = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "plimsoll.account", "arguments": {}},
        },
    )
    body = r.json()["result"]["structuredContent"]
    assert body["connected"] is False
    assert body["account_kind"] == "NOT_CONNECTED"
    assert "3346001" in body["reason"]
    assert "access_token" not in str(body).lower()


def test_mcp_capacity_replay_classified():
    snap = snapshot()
    r = client.post(
        "/v1/capacity",
        json={"symbol": "ARKUSDT", "replay": snap.model_dump(mode="json")},
    )
    assert r.status_code == 200
    assert r.json()["classification"] == "REPLAY"


def test_mcp_oauth_status_has_no_token():
    r = client.post(
        "/mcp",
        json={"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "plimsoll.oauth_status", "arguments": {}}},
    )
    body = r.json()["result"]["structuredContent"]
    assert body["bound"] is False
    assert "3346001" in body["note"]
    assert "access_token" not in body
