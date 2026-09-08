from __future__ import annotations

from decimal import Decimal

from app.core.book import mid_price
from app.core.capacity import estimate_exit_capacity
from app.core.schemas import (
    Action,
    AgentState,
    CapacityResult,
    Constitution,
    Decision,
    Intent,
    MarketSnapshot,
    Position,
)
from app.core.sizing import legalize_market


def decide(
    *,
    intent: Intent,
    snapshot: MarketSnapshot,
    constitution: Constitution,
    position: Position | None = None,
    previous_capacity: Decimal | None = None,
    now_ts: float | None = None,
) -> Decision:
    if intent.needs_clarification:
        cap = estimate_exit_capacity(snapshot, constitution, now_ts=now_ts)
        return Decision(
            action=Action.ASK,
            state=AgentState.ACTION_REQUIRED,
            intent=intent,
            capacity=cap,
            reason=intent.clarification or "Need clarification before sizing.",
        )

    cap = estimate_exit_capacity(snapshot, constitution, now_ts=now_ts)
    if "STALE_SNAPSHOT" in cap.warnings:
        return Decision(
            action=Action.REFUSE,
            state=AgentState.DEGRADED,
            intent=intent,
            capacity=cap,
            reason="Stale market snapshot. Re-observe before any action.",
        )

    mid = mid_price(snapshot)
    held_notional = None
    if position and position.base_qty > 0 and mid:
        held_notional = position.base_qty * mid
    elif intent.held_notional is not None:
        held_notional = intent.held_notional

    over = bool(held_notional is not None and held_notional > cap.estimated_exit_capacity_notional)

    falling = (
        constitution.never_increase_if_capacity_falling
        and previous_capacity is not None
        and cap.estimated_exit_capacity_notional < previous_capacity
    )

    requested = intent.target_notional
    if requested is None and not over:
        if intent.side_hint == "HOLD":
            falling_hold = (
                previous_capacity is not None
                and cap.estimated_exit_capacity_notional < previous_capacity
            )
            return Decision(
                action=Action.WAIT,
                state=AgentState.WATCH if falling_hold else AgentState.NORMAL,
                intent=intent,
                capacity=cap,
                held_notional=held_notional,
                over_capacity=False,
                reason="Held position is within estimated exit capacity under stated constraints.",
            )
        return Decision(
            action=Action.ASK,
            state=AgentState.ACTION_REQUIRED,
            intent=intent,
            capacity=cap,
            held_notional=held_notional,
            over_capacity=over,
            reason="Missing target notional. Ask the user for a dollar size.",
        )

    if over:
        return Decision(
            action=Action.TRIM_HELD,
            state=AgentState.OVER_CAPACITY,
            intent=intent,
            capacity=cap,
            requested_notional=requested,
            held_notional=held_notional,
            over_capacity=True,
            reason=(
                "Held position exceeds estimated exit capacity under stated constraints. "
                "Propose trim. Never silently sell."
            ),
        )

    if falling and requested and requested > 0:
        return Decision(
            action=Action.REFUSE,
            state=AgentState.WATCH,
            intent=intent,
            capacity=cap,
            requested_notional=requested,
            held_notional=held_notional,
            reason="Capacity is falling and constitution forbids increasing the position.",
        )

    if cap.estimated_exit_capacity_notional <= 0:
        return Decision(
            action=Action.REFUSE,
            state=AgentState.DEGRADED,
            intent=intent,
            capacity=cap,
            requested_notional=requested,
            held_notional=held_notional,
            reason="Estimated exit capacity is zero under stated constraints.",
        )

    assert requested is not None
    room = cap.estimated_exit_capacity_notional
    if constitution.max_order_notional is not None:
        room = min(room, constitution.max_order_notional)

    if requested <= room:
        legal = legalize_market(
            symbol=snapshot.symbol,
            side=intent.side_hint or "BUY",
            quote_notional=requested,
            ref_price=mid or snapshot.last_price,
            filters=snapshot.filters,
        )
        action = Action.FILL_AS_ASKED if not legal.clipped or legal.notional > 0 else Action.REFUSE
        state = AgentState.NORMAL if action == Action.FILL_AS_ASKED else AgentState.ACTION_REQUIRED
        return Decision(
            action=action,
            state=state,
            intent=intent,
            capacity=cap,
            requested_notional=requested,
            legal_order=legal,
            held_notional=held_notional,
            reason="Requested size fits estimated exit capacity after legalize.",
        )

    legal = legalize_market(
        symbol=snapshot.symbol,
        side=intent.side_hint or "BUY",
        quote_notional=room,
        ref_price=mid or snapshot.last_price,
        filters=snapshot.filters,
    )
    return Decision(
        action=Action.SIZE_DOWN,
        state=AgentState.ACTION_REQUIRED,
        intent=intent,
        capacity=cap,
        requested_notional=requested,
        legal_order=legal,
        held_notional=held_notional,
        reason=(
            f"Requested {requested} exceeds estimated exit capacity {room} "
            f"(binding {cap.binding.value}). Propose legalized smaller size."
        ),
    )


def capacity_collapse(
    previous: CapacityResult,
    current: CapacityResult,
) -> bool:
    return current.estimated_exit_capacity_notional < previous.estimated_exit_capacity_notional
