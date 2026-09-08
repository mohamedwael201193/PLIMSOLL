from __future__ import annotations

from decimal import Decimal

from app.core.filters import filters_from_exchange_info


def test_notional_apply_max_to_market_false():
    info = {
        "baseAsset": "ARK",
        "quoteAsset": "USDT",
        "filters": [
            {"filterType": "PRICE_FILTER", "tickSize": "0.00010000"},
            {"filterType": "LOT_SIZE", "minQty": "0.10000000", "maxQty": "9000000", "stepSize": "0.10000000"},
            {"filterType": "MARKET_LOT_SIZE", "minQty": "0.10000000", "maxQty": "331926", "stepSize": "0.10000000"},
            {
                "filterType": "NOTIONAL",
                "minNotional": "5.00000000",
                "applyMinToMarket": True,
                "maxNotional": "9000000",
                "applyMaxToMarket": False,
            },
        ],
    }
    f = filters_from_exchange_info(info)
    assert f.apply_max_to_market is False
    assert f.apply_min_to_market is True
    assert f.min_notional == Decimal("5.00000000")
    assert f.base_asset == "ARK"


def test_btc_like_precision_is_generic():
    info = {
        "baseAsset": "BTC",
        "quoteAsset": "USDT",
        "filters": [
            {"filterType": "PRICE_FILTER", "tickSize": "0.01000000"},
            {"filterType": "LOT_SIZE", "minQty": "0.00001000", "maxQty": "9000", "stepSize": "0.00001000"},
            {"filterType": "MARKET_LOT_SIZE", "minQty": "0.00001000", "maxQty": "9000", "stepSize": "0.00001000"},
            {
                "filterType": "NOTIONAL",
                "minNotional": "5.00000000",
                "applyMinToMarket": True,
                "applyMaxToMarket": False,
            },
        ],
    }
    f = filters_from_exchange_info(info)
    assert f.tick_size == Decimal("0.01000000")
    assert f.lot_step == Decimal("0.00001000")
    assert f.min_notional == Decimal("5.00000000")
    assert f.base_asset == "BTC"


def test_unusual_eight_dp_precision():
    info = {
        "baseAsset": "XYZ",
        "quoteAsset": "USDT",
        "filters": [
            {"filterType": "PRICE_FILTER", "tickSize": "0.00000001"},
            {"filterType": "LOT_SIZE", "minQty": "0.00000001", "maxQty": "1000000", "stepSize": "0.00000001"},
            {
                "filterType": "NOTIONAL",
                "minNotional": "1.00000000",
                "applyMinToMarket": True,
                "applyMaxToMarket": False,
            },
        ],
    }
    f = filters_from_exchange_info(info)
    assert f.tick_size == Decimal("0.00000001")
    assert f.lot_step == Decimal("0.00000001")
    assert f.market_lot_step == Decimal("0.00000001")


def test_missing_filters_do_not_raise():
    f = filters_from_exchange_info({"baseAsset": "AAA", "quoteAsset": "USDT", "filters": []})
    assert f.min_notional == Decimal("0")
    assert f.lot_step > 0
