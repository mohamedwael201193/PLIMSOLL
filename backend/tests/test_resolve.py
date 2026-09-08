from __future__ import annotations

from decimal import Decimal

from app.agent.reconcile import reconcile
from app.agent.resolve import re_solve
from app.core.schemas import FillReport, Position
from tests.conftest import CONST, snapshot


def test_resolve_over_capacity_never_silent_sell():
    snap = snapshot(bids=[("1.00", "10")], asks=[("1.01", "10")], quote_volume="10")
    pos = Position(symbol="ARKUSDT", base_qty=Decimal("4000"))
    d = re_solve(snapshot=snap, constitution=CONST, position=pos)
    assert d.over_capacity
    assert d.action.value == "TRIM_HELD"
    assert "Never silently sell" in d.reason


def test_resolve_within_capacity_wait():
    snap = snapshot(quote_volume="1000000")
    pos = Position(symbol="ARKUSDT", base_qty=Decimal("1"))
    d = re_solve(snapshot=snap, constitution=CONST, position=pos)
    assert d.over_capacity is False
    assert d.action.value == "WAIT"


def test_capacity_collapse_between_snapshots():
    from app.core.policy import capacity_collapse
    from app.core.capacity import estimate_exit_capacity

    a = estimate_exit_capacity(snapshot(quote_volume="1000000"), CONST)
    b = estimate_exit_capacity(snapshot(quote_volume="10"), CONST)
    assert a.estimated_exit_capacity_notional > b.estimated_exit_capacity_notional
    assert capacity_collapse(a, b) is True


def test_reconcile_partial_requires_new_approval():
    fill = FillReport(
        classification="REPLAY",
        client_order_id="plim_x",
        status="PARTIALLY_FILLED",
        executed_qty=Decimal("1"),
        orig_qty=Decimal("5"),
        requested_qty=Decimal("5"),
    )
    rec = reconcile(fill)
    assert rec["partial"] is True
    assert rec["success"] is False
    assert rec["requires_fresh_approval"] is True
    assert rec["remaining_qty"] == "4"
