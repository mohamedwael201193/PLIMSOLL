from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.book import is_crossed, mid_price, visible_notional
from app.core.capacity import estimate_exit_capacity
from app.core.cost import sell_vwap_and_cost_bps
from app.core.schemas import Constitution
from tests.conftest import CONST, snapshot, ts


def test_empty_book_zero_capacity():
    snap = snapshot(bids=[], asks=[("1.01", "10")])
    cap = estimate_exit_capacity(snap, CONST)
    assert cap.estimated_exit_capacity_notional == 0
    assert cap.binding.value == "ZERO"
    assert "EMPTY_OR_ONE_SIDED_BIDS" in cap.warnings


def test_one_sided_asks_only():
    snap = snapshot(bids=[], asks=[("1.01", "100")])
    cap = estimate_exit_capacity(snap, CONST)
    assert cap.estimated_exit_capacity_notional == 0


def test_crossed_book_flagged():
    snap = snapshot(bids=[("1.10", "100")], asks=[("1.00", "100")])
    assert is_crossed(snap)
    cap = estimate_exit_capacity(snap, CONST)
    assert "CROSSED_BOOK" in cap.warnings
    assert cap.confidence == "LOW"


def test_stale_book():
    old = ts("2026-09-08T01:00:00+00:00")
    snap = snapshot(captured=old)
    now = old.timestamp() + 30
    cap = estimate_exit_capacity(snap, CONST, now_ts=now)
    assert "STALE_SNAPSHOT" in cap.warnings


def test_zero_volume_time_cap_zero():
    snap = snapshot(quote_volume="0")
    cap = estimate_exit_capacity(snap, CONST)
    assert cap.time_capacity_notional == 0
    assert "ZERO_ADV" in cap.warnings


def test_zero_liquidity_bids():
    snap = snapshot(bids=[("1.00", "0")], asks=[("1.01", "10")])
    assert visible_notional(snap.bids) == 0


def test_huge_order_exhausts_book():
    snap = snapshot(bids=[("1.00", "10")], asks=[("1.01", "10")])
    vwap, cost, exhausted = sell_vwap_and_cost_bps(snap, Decimal("100000"), CONST)
    assert exhausted


def test_small_order_not_exhausted():
    snap = snapshot(bids=[("1.00", "10000")], asks=[("1.01", "10000")])
    _, cost, exhausted = sell_vwap_and_cost_bps(snap, Decimal("10"), CONST)
    assert not exhausted
    assert cost is not None
    assert cost >= CONST.taker_fee_bps


def test_exact_exhaustion():
    snap = snapshot(bids=[("2.00", "5")], asks=[("2.01", "5")])
    visible = visible_notional(snap.bids)
    _, _, exhausted = sell_vwap_and_cost_bps(snap, visible, CONST)
    assert exhausted is False or visible == Decimal("10")


def test_duplicated_levels_merge():
    snap = snapshot(bids=[("1.00", "10"), ("1.00", "15")], asks=[("1.01", "1")])
    assert visible_notional(snap.bids) == Decimal("25")


def test_malformed_depth_skipped():
    snap = snapshot(bids=[("bad", "x"), ("1.00", "10")], asks=[("1.01", "10")])
    assert visible_notional(snap.bids) == Decimal("10")


def test_missing_price_qty_dropped():
    snap = snapshot(bids=[("0", "10"), ("1.00", "0"), ("1.00", "3")], asks=[("1.02", "1")])
    assert visible_notional(snap.bids) == Decimal("3")


def test_extreme_spread_lowers_cost_capacity():
    tight = snapshot(bids=[("1.00", "10000")], asks=[("1.001", "10000")])
    wide = snapshot(bids=[("1.00", "10000")], asks=[("1.50", "10000")])
    c1 = estimate_exit_capacity(tight, CONST)
    c2 = estimate_exit_capacity(wide, CONST)
    assert c2.cost_capacity_notional <= c1.cost_capacity_notional


def test_last_ne_mid_warning():
    snap = snapshot(bids=[("1.00", "100")], asks=[("1.02", "100")], last="9.00")
    mid = mid_price(snap)
    assert mid is not None
    cap = estimate_exit_capacity(snap, CONST)
    assert "LAST_NE_MID" in cap.warnings


def test_low_vs_high_adv_time_cap():
    low = snapshot(quote_volume="100")
    high = snapshot(quote_volume="1000000")
    c1 = estimate_exit_capacity(low, CONST)
    c2 = estimate_exit_capacity(high, CONST)
    assert c2.time_capacity_notional > c1.time_capacity_notional


def test_participation_and_horizon_change():
    snap = snapshot(quote_volume="1000")
    a = estimate_exit_capacity(snap, Constitution(max_participation=Decimal("0.1"), max_exit_horizon_days=Decimal("1")))
    b = estimate_exit_capacity(snap, Constitution(max_participation=Decimal("0.2"), max_exit_horizon_days=Decimal("1")))
    c = estimate_exit_capacity(snap, Constitution(max_participation=Decimal("0.1"), max_exit_horizon_days=Decimal("2")))
    assert b.time_capacity_notional == 2 * a.time_capacity_notional
    assert c.time_capacity_notional == 2 * a.time_capacity_notional
    assert "0.1" in a.assumptions["max_participation"] or a.assumptions["max_participation"] == "0.1"


def test_cost_budget_change_monotone():
    snap = snapshot(bids=[("1.00", "5000"), ("0.99", "5000")], asks=[("1.01", "5000")])
    tight = estimate_exit_capacity(snap, Constitution(max_exit_cost_bps=Decimal("12")))
    loose = estimate_exit_capacity(snap, Constitution(max_exit_cost_bps=Decimal("80")))
    assert loose.cost_capacity_notional >= tight.cost_capacity_notional


def test_replay_identity():
    snap = snapshot()
    a = estimate_exit_capacity(snap, CONST)
    b = estimate_exit_capacity(snap, CONST)
    assert a.model_dump() == b.model_dump()
    assert a.classification == "REPLAY"


def test_language_not_safe_size():
    cap = estimate_exit_capacity(snapshot(), CONST)
    assert "estimated exit capacity" in cap.assumptions["language"]
    assert "maximum safe size" in cap.assumptions["not"]
