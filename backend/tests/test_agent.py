from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.agent.approval import issue_approval, validate_approval
from app.agent.loop import run_once
from app.core.policy import decide
from app.core.residual import is_partial, remaining_qty
from app.core.schemas import FillReport, Intent, Position
from tests.conftest import CONST, snapshot


def test_intent_ark_one_day():
    d = run_once(
        text="I want $1000 of ARK and need to exit within one day.",
        snapshot=snapshot(quote_volume="1000000"),
        constitution=CONST,
    )
    assert d.intent.symbol == "ARKUSDT"
    assert d.intent.target_notional == Decimal("1000")
    assert d.intent.needs_clarification is False


def test_intent_bps_constraint():
    d = run_once(
        text="Buy $500 of ARKUSDT but don't exceed 50 bps exit cost.",
        snapshot=snapshot(),
        constitution=CONST,
    )
    assert d.intent.constitution_overrides.get("max_exit_cost_bps") == "50"


def test_intent_hold_over_capacity():
    d = run_once(
        text="I already hold $4000; tell me if I'm over capacity.",
        snapshot=snapshot(bids=[("1.00", "10")], asks=[("1.01", "10")], quote_volume="10"),
        constitution=CONST,
    )
    assert d.over_capacity or d.action.value in {"TRIM_HELD", "ASK", "REFUSE"}


def test_intent_do_not_increase_if_falling():
    snap = snapshot(quote_volume="1000")
    d = run_once(
        text="Buy $100 of ARK. Do not increase my position if liquidity is falling.",
        snapshot=snap,
        constitution=CONST,
        previous_capacity=Decimal("100000"),
    )
    assert d.action.value == "REFUSE"


def test_unknown_symbol_x_asks():
    d = run_once(
        text="Buy $500 of X but don't exceed 50 bps exit cost.",
        snapshot=snapshot(),
        constitution=CONST,
    )
    assert d.action.value == "ASK"
    assert d.intent.needs_clarification


def test_malformed_empty():
    d = run_once(text="   ", snapshot=snapshot(), constitution=CONST)
    assert d.action.value == "ASK"


def test_impossible_zero_capacity_refuse():
    d = run_once(
        text="Buy $500 of ARKUSDT",
        snapshot=snapshot(bids=[], asks=[]),
        constitution=CONST,
    )
    assert d.action.value in {"REFUSE", "ASK"}


def test_stale_refuses_action():
    old = snapshot()
    d = decide(
        intent=Intent(raw_text="buy", symbol="ARKUSDT", target_notional=Decimal("10"), side_hint="BUY"),
        snapshot=old,
        constitution=CONST,
        now_ts=old.captured_at.timestamp() + 30,
    )
    assert d.action.value == "REFUSE"
    assert d.state.value == "DEGRADED"


def test_snapshot_mismatch_voids_approval():
    d = run_once(text="Buy $10 of ARKUSDT", snapshot=snapshot(), constitution=CONST)
    ap = issue_approval(d)
    err = validate_approval(
        ap,
        snapshot_hash="different",
        confirm_text="CONFIRM",
        writes_enabled=True,
    )
    assert err == "SNAPSHOT_MISMATCH"


def test_stale_approval():
    d = run_once(text="Buy $10 of ARKUSDT", snapshot=snapshot(), constitution=CONST)
    ap = issue_approval(d, ttl_s=0)
    ap.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    err = validate_approval(
        ap,
        snapshot_hash=ap.snapshot_hash,
        confirm_text="CONFIRM",
        writes_enabled=True,
    )
    assert err == "APPROVAL_EXPIRED"


def test_confirm_required():
    d = run_once(text="Buy $10 of ARKUSDT", snapshot=snapshot(), constitution=CONST)
    ap = issue_approval(d)
    err = validate_approval(
        ap,
        snapshot_hash=ap.snapshot_hash,
        confirm_text="yes",
        writes_enabled=True,
    )
    assert err == "CONFIRM_REQUIRED"


def test_writes_disabled_blocks():
    d = run_once(text="Buy $10 of ARKUSDT", snapshot=snapshot(), constitution=CONST)
    ap = issue_approval(d)
    err = validate_approval(
        ap,
        snapshot_hash=ap.snapshot_hash,
        confirm_text="CONFIRM",
        writes_enabled=False,
    )
    assert err == "WRITES_DISABLED"


def test_partial_fill_not_success():
    fill = FillReport(
        classification="PAPER",
        client_order_id="plim_x",
        status="PARTIALLY_FILLED",
        executed_qty=Decimal("1"),
        requested_qty=Decimal("5"),
    )
    assert is_partial(fill)
    assert remaining_qty(fill) == Decimal("4")


def test_idempotent_client_order_id():
    from app.core.hashing import client_order_id

    a = client_order_id("intent-1", 0)
    b = client_order_id("intent-1", 0)
    c = client_order_id("intent-1", 1)
    assert a == b
    assert a != c
    assert a.startswith("plim_")
    assert len(a) <= 36
