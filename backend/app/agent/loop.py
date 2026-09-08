from __future__ import annotations

from decimal import Decimal

from app.agent.intent import parse_intent
from app.core.policy import decide
from app.core.schemas import Constitution, Decision, MarketSnapshot, Position


def apply_overrides(base: Constitution, overrides: dict) -> Constitution:
    data = base.model_dump()
    data.update(overrides)
    return Constitution.model_validate(data)


def run_once(
    *,
    text: str,
    snapshot: MarketSnapshot,
    constitution: Constitution,
    position: Position | None = None,
    previous_capacity: Decimal | None = None,
    now_ts: float | None = None,
) -> Decision:
    intent = parse_intent(text)
    if intent.symbol and intent.symbol != snapshot.symbol:
        intent.needs_clarification = True
        intent.clarification = (
            f"Intent symbol {intent.symbol} does not match snapshot {snapshot.symbol}."
        )
    const = apply_overrides(constitution, intent.constitution_overrides)
    return decide(
        intent=intent,
        snapshot=snapshot,
        constitution=const,
        position=position,
        previous_capacity=previous_capacity,
        now_ts=now_ts,
    )
