from __future__ import annotations

from decimal import Decimal

from app.core.book import mid_price
from app.core.capacity import estimate_exit_capacity
from app.core.policy import decide
from app.core.schemas import (
    Action,
    AgentState,
    Constitution,
    Decision,
    Intent,
    MarketSnapshot,
    Position,
)


def re_solve(
    *,
    snapshot: MarketSnapshot,
    constitution: Constitution,
    position: Position,
    previous_capacity: Decimal | None = None,
    now_ts: float | None = None,
) -> Decision:
    """Re-invert held exposure against a fresh snapshot. Never silently sells."""
    mid = mid_price(snapshot)
    held = None
    if position.base_qty > 0 and mid:
        held = position.base_qty * mid
    intent = Intent(
        raw_text="re-solve held position",
        symbol=snapshot.symbol,
        target_notional=None,
        side_hint="HOLD",
        held_notional=held,
    )
    if held is None and position.base_qty <= 0:
        cap = estimate_exit_capacity(snapshot, constitution, now_ts=now_ts)
        return Decision(
            action=Action.WAIT,
            state=AgentState.NORMAL,
            intent=intent,
            capacity=cap,
            reason="No held position. Re-solve is observe-only.",
        )
    decision = decide(
        intent=intent,
        snapshot=snapshot,
        constitution=constitution,
        position=position,
        previous_capacity=previous_capacity,
        now_ts=now_ts,
    )
    if decision.action == Action.ASK and held is not None:
        # HOLD with known notional should not ask for a buy size.
        if decision.over_capacity:
            decision.action = Action.TRIM_HELD
            decision.state = AgentState.OVER_CAPACITY
            decision.reason = (
                "Held position exceeds estimated exit capacity under stated constraints. "
                "Propose trim. Never silently sell."
            )
        else:
            decision.action = Action.WAIT
            decision.state = AgentState.WATCH if previous_capacity and decision.capacity.estimated_exit_capacity_notional < previous_capacity else AgentState.NORMAL
            decision.reason = "Held position is within estimated exit capacity under stated constraints."
    return decision
