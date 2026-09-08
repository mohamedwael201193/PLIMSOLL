from __future__ import annotations

from decimal import Decimal

from hypothesis import given, settings, strategies as st

from app.core.capacity import estimate_exit_capacity
from app.core.schemas import Constitution
from app.core.sizing import legalize_market
from tests.conftest import filters, snapshot


@given(budget=st.floats(min_value=12, max_value=200, allow_nan=False, allow_infinity=False))
@settings(max_examples=25, deadline=None)
def test_capacity_monotone_in_cost_budget(budget: float):
    snap = snapshot(bids=[("1.00", "8000"), ("0.99", "8000")], asks=[("1.01", "8000")], quote_volume="1000000")
    low = estimate_exit_capacity(snap, Constitution(max_exit_cost_bps=Decimal("12")))
    high = estimate_exit_capacity(snap, Constitution(max_exit_cost_bps=Decimal(str(round(budget, 2)))))
    assert high.cost_capacity_notional >= low.cost_capacity_notional


@given(step=st.sampled_from(["0.00000001", "0.00001", "0.001", "0.1", "1", "10"]))
@settings(max_examples=18, deadline=None)
def test_legalize_respects_generic_step(step: str):
    step_d = Decimal(step)
    legal = legalize_market(
        symbol="XYZUSDT",
        side="SELL",
        quote_notional=Decimal("100"),
        ref_price=Decimal("2"),
        filters=filters(
            market_lot_step=step_d,
            market_lot_min=Decimal("0"),
            min_notional=Decimal("0"),
            apply_min_to_market=False,
        ),
    )
    if legal.quantity is not None and step_d > 0:
        rem = (legal.quantity / step_d) % 1
        assert rem == 0


def test_solver_is_symbol_agnostic_btc_fixture():
    snap = snapshot(
        symbol="BTCUSDT",
        last="65000",
        bids=[("65000", "0.4"), ("64990", "0.8")],
        asks=[("65010", "0.5")],
        quote_volume="1000000000",
        filt=filters(
            tick_size=Decimal("0.01"),
            lot_min=Decimal("0.00001"),
            lot_step=Decimal("0.00001"),
            market_lot_min=Decimal("0.00001"),
            market_lot_step=Decimal("0.00001"),
            min_notional=Decimal("5"),
        ),
    )
    cap = estimate_exit_capacity(snap, Constitution())
    assert cap.estimated_exit_capacity_notional > 0
    assert cap.cost_capacity_notional > 0
    assert cap.time_capacity_notional > 0
    assert cap.binding.value in {"COST", "TIME", "BOOK_FRACTION", "FILTER", "ZERO"}


def test_malformed_book_fails_safely():
    snap = snapshot(bids=[("nope", "x"), ("1.00", "-4"), ("0.99", "10")], asks=[("1.01", "10")])
    cap = estimate_exit_capacity(snap, Constitution())
    assert cap.estimated_exit_capacity_notional >= 0
    assert cap.cost_capacity_notional >= 0
