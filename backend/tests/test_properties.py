from __future__ import annotations

from decimal import Decimal

from hypothesis import given, settings, strategies as st

from app.core.capacity import estimate_exit_capacity
from app.core.schemas import Constitution
from tests.conftest import snapshot


@given(budget=st.floats(min_value=12, max_value=200, allow_nan=False, allow_infinity=False))
@settings(max_examples=25, deadline=None)
def test_capacity_monotone_in_cost_budget(budget: float):
    snap = snapshot(bids=[("1.00", "8000"), ("0.99", "8000")], asks=[("1.01", "8000")], quote_volume="1000000")
    low = estimate_exit_capacity(snap, Constitution(max_exit_cost_bps=Decimal("12")))
    high = estimate_exit_capacity(snap, Constitution(max_exit_cost_bps=Decimal(str(round(budget, 2)))))
    assert high.cost_capacity_notional >= low.cost_capacity_notional
