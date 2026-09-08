from __future__ import annotations

from decimal import Decimal

from app.core.schemas import BookLevel, MarketSnapshot


def best_bid(snapshot: MarketSnapshot) -> Decimal | None:
    return snapshot.bids[0].price if snapshot.bids else None


def best_ask(snapshot: MarketSnapshot) -> Decimal | None:
    return snapshot.asks[0].price if snapshot.asks else None


def mid_price(snapshot: MarketSnapshot) -> Decimal | None:
    bb = best_bid(snapshot)
    ba = best_ask(snapshot)
    if bb is not None and ba is not None:
        return (bb + ba) / Decimal("2")
    if bb is not None:
        return bb
    if ba is not None:
        return ba
    if snapshot.last_price > 0:
        return snapshot.last_price
    return None


def is_crossed(snapshot: MarketSnapshot) -> bool:
    bb = best_bid(snapshot)
    ba = best_ask(snapshot)
    return bb is not None and ba is not None and bb > ba


def visible_notional(levels: list[BookLevel]) -> Decimal:
    total = Decimal("0")
    for lvl in levels:
        if lvl.price <= 0 or lvl.quantity <= 0:
            continue
        total += lvl.price * lvl.quantity
    return total


def normalize_levels(raw: list[list[str] | tuple[str, str] | BookLevel], *, reverse: bool) -> list[BookLevel]:
    levels: list[BookLevel] = []
    seen: dict[Decimal, Decimal] = {}
    for item in raw:
        if isinstance(item, BookLevel):
            px, qty = item.price, item.quantity
        else:
            if len(item) < 2:
                continue
            try:
                px = Decimal(str(item[0]))
                qty = Decimal(str(item[1]))
            except Exception:
                continue
        if px <= 0 or qty <= 0:
            continue
        seen[px] = seen.get(px, Decimal("0")) + qty
    ordered = sorted(seen.items(), key=lambda kv: kv[0], reverse=reverse)
    for px, qty in ordered:
        levels.append(BookLevel(price=px, quantity=qty))
    return levels
