from __future__ import annotations

from decimal import Decimal

from app.rails.market import fetch_snapshot
from app.core.capacity import estimate_exit_capacity
from app.core.schemas import Constitution


def test_live_public_rest_arkusdt_capacity():
    snap = fetch_snapshot(
        symbol="ARKUSDT",
        rest_base="https://api.binance.com",
        timeout_s=10,
        classification="LIVE",
    )
    assert snap.classification == "LIVE"
    assert snap.symbol == "ARKUSDT"
    assert snap.snapshot_hash
    assert snap.captured_at
    assert snap.source.startswith("https://api.binance.com")
    assert snap.filters.min_notional >= 0
    cap = estimate_exit_capacity(snap, Constitution())
    assert cap.classification == "LIVE"
    assert cap.estimated_exit_capacity_notional >= Decimal("0")
    assert cap.cost_capacity_notional >= Decimal("0")
    assert cap.time_capacity_notional >= Decimal("0")
    assert "max_participation" in cap.assumptions
    assert cap.assumptions["language"] == "estimated exit capacity under stated constraints"
