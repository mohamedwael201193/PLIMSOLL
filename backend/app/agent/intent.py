from __future__ import annotations

import re
from decimal import Decimal

from app.core.schemas import Intent

_SYMBOL = re.compile(r"\b([A-Z]{2,10})(?:USDT)?\b")
_USD = re.compile(r"\$\s*([0-9]+(?:\.[0-9]+)?)\s*(?:of\s+)?", re.I)
_BPS = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*bps", re.I)
_DAYS = re.compile(r"(?:within|in)\s+(one|1|a)\s+day", re.I)
_HOLD = re.compile(r"(already hold|i hold|i'm holding|over capacity)", re.I)
_NO_INCREASE = re.compile(r"do not increase|don't increase|liquidity is falling", re.I)
_BUY = re.compile(r"\b(buy|want)\b", re.I)
_KNOWN = {
    "ARK": "ARKUSDT",
    "ARKUSDT": "ARKUSDT",
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "USDT": None,
}


def parse_intent(text: str) -> Intent:
    notes: list[str] = []
    raw = text.strip()
    if not raw:
        return Intent(
            raw_text=text,
            needs_clarification=True,
            clarification="Empty request. Ask for symbol, dollar size, and exit constraints.",
        )

    symbol = None
    for match in _SYMBOL.finditer(raw.upper().replace("USDT", "USDT")):
        token = match.group(1)
        cand = _KNOWN.get(token) or _KNOWN.get(token + "USDT")
        if token in {
            "I", "IF", "IN", "OF", "DO", "NOT", "MY", "AM", "ME", "WE",
            "BUY", "SELL", "WANT", "NEED", "EXIT", "WITHIN", "ONE", "DAY",
            "HOLD", "TELL", "THE", "AND", "FOR", "BUT", "COST", "BPS",
            "DONT", "INCREASE", "POSITION", "LIQUIDITY", "FALLING",
            "ALREADY", "OVER", "CAPACITY", "USDT",
        }:
            continue
        if cand:
            symbol = cand
            break
        if token.endswith("USDT") and len(token) > 4:
            symbol = token
            break
    # ARK special from mixed case
    if symbol is None:
        m = re.search(r"\bARK\b", raw, re.I)
        if m:
            symbol = "ARKUSDT"
    if symbol is None:
        m = re.search(r"\b([A-Za-z]{2,10})USDT\b", raw, re.I)
        if m:
            symbol = m.group(0).upper()

    usd = _USD.search(raw)
    target = Decimal(usd.group(1)) if usd else None
    hold_m = re.search(r"hold\s+\$?\s*([0-9]+(?:\.[0-9]+)?)", raw, re.I)
    held = Decimal(hold_m.group(1)) if hold_m else None

    overrides: dict = {}
    bps = _BPS.search(raw)
    if bps:
        overrides["max_exit_cost_bps"] = bps.group(1)
        notes.append("exit_cost_bps_from_text")
    if _DAYS.search(raw):
        overrides["max_exit_horizon_days"] = "1"
        notes.append("horizon_1d_from_text")
    if _NO_INCREASE.search(raw):
        overrides["never_increase_if_capacity_falling"] = True
        notes.append("no_increase_if_falling")

    side = None
    if _HOLD.search(raw) or held is not None:
        side = "HOLD"
    elif _BUY.search(raw):
        side = "BUY"

    needs = False
    clarification = None
    if symbol is None:
        needs = True
        clarification = "Which symbol? Use an official Spot pair such as ARKUSDT."
    elif target is None and held is None and side != "HOLD":
        needs = True
        clarification = "What notional in quote (USDT) do you want, and what exit cost/horizon constraints?"

    if "X " in raw.upper() or re.search(r"\bX\b", raw):
        # "Buy $500 of X" — unknown symbol
        if re.search(r"\bX\b", raw) and "ARK" not in raw.upper() and "USDT" not in raw.upper():
            needs = True
            symbol = None
            clarification = "Symbol X is not a listed pair. Specify an official symbol."

    return Intent(
        raw_text=text,
        symbol=symbol,
        target_notional=target,
        side_hint=side,
        constitution_overrides=overrides,
        held_notional=held,
        needs_clarification=needs,
        clarification=clarification,
        parse_notes=notes,
    )
