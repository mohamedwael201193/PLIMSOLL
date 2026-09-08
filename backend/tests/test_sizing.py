from __future__ import annotations

from decimal import Decimal

from app.core.sizing import legalize_market
from tests.conftest import filters


def test_min_notional_clips_to_zero():
    legal = legalize_market(
        symbol="ARKUSDT",
        side="BUY",
        quote_notional=Decimal("1"),
        ref_price=Decimal("1"),
        filters=filters(min_notional=Decimal("5"), apply_min_to_market=True),
    )
    assert legal.clipped
    assert "MIN_NOTIONAL" in legal.clip_reasons or legal.notional == 0


def test_market_lot_step():
    legal = legalize_market(
        symbol="ARKUSDT",
        side="SELL",
        quote_notional=Decimal("10.7"),
        ref_price=Decimal("1"),
        filters=filters(market_lot_step=Decimal("1"), apply_min_to_market=False),
    )
    assert legal.quantity == Decimal("10") or legal.quote_order_qty is None


def test_quantity_precision_floor():
    legal = legalize_market(
        symbol="ARKUSDT",
        side="SELL",
        quote_notional=Decimal("10.9"),
        ref_price=Decimal("1"),
        filters=filters(market_lot_step=Decimal("1"), min_notional=Decimal("0"), apply_min_to_market=False),
    )
    assert legal.quantity is not None
    assert legal.quantity == legal.quantity.to_integral_value()


def test_apply_max_to_market_false_does_not_clip_max():
    legal = legalize_market(
        symbol="ARKUSDT",
        side="BUY",
        quote_notional=Decimal("99999"),
        ref_price=Decimal("1"),
        filters=filters(
            max_notional=Decimal("10"),
            apply_max_to_market=False,
            apply_min_to_market=False,
            market_lot_max=Decimal("1e12"),
        ),
    )
    assert "MAX_NOTIONAL" not in legal.clip_reasons
