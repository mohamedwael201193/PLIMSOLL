from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import snapshot


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["writes_enabled"] is False
    assert "X-Request-Id" in r.headers


def test_capacity_replay_labelled():
    snap = snapshot()
    r = client.post(
        "/v1/capacity",
        json={"symbol": "ARKUSDT", "replay": snap.model_dump(mode="json")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["classification"] == "REPLAY"
    assert "estimated exit capacity" in body["language"]
    cap = body["capacity"]
    assert "estimated_exit_capacity_notional" in cap
    assert "cost_capacity_notional" in cap
    assert "time_capacity_notional" in cap
    market = body["market"]
    assert market["classification"] == "REPLAY"
    assert market["bids"]
    assert market["last_price"]


def test_intent_asks_on_unknown_symbol():
    r = client.post("/v1/intent", json={"text": "Buy $500 of X but don't exceed 50 bps exit cost."})
    assert r.status_code == 200
    body = r.json()
    assert body["needs_clarification"] is True or body.get("intent", {}).get("needs_clarification") is True


def test_execute_unknown_approval():
    r = client.post(
        "/v1/execute",
        json={
            "confirm": "CONFIRM",
            "confirmation_token": "nope",
            "snapshot_hash": "abc",
            "symbol": "ARKUSDT",
            "quote_order_qty": "5",
        },
    )
    assert r.status_code == 400
    assert r.json()["detail"]["error_class"] == "UNKNOWN_APPROVAL"


def test_resolve_replay():
    snap = snapshot()
    r = client.post(
        "/v1/resolve",
        json={
            "symbol": "ARKUSDT",
            "position": {"symbol": "ARKUSDT", "base_qty": "1"},
            "replay": snap.model_dump(mode="json"),
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["classification"] == "REPLAY"
    assert body["market"]["classification"] == "REPLAY"
    assert "bids" in body["market"]


def test_snapshots_without_db_is_empty():
    r = client.get("/v1/snapshots/ARKUSDT")
    assert r.status_code == 200
    body = r.json()
    assert body["observations"] == []
    assert "LIVE" not in (body.get("note") or "")


def test_fills_without_db_is_empty():
    r = client.get("/v1/fills")
    assert r.status_code == 200
    assert r.json()["fills"] == []
