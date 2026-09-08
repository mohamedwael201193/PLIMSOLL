from __future__ import annotations

import httpx
import pytest

from app.rails.market import MarketError, fetch_snapshot


def _transport(status: int, payload):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json=payload)
    return httpx.MockTransport(handler)


def test_429_is_rate_limit():
    client = httpx.Client(transport=_transport(429, {"msg": "slow"}))
    with pytest.raises(MarketError) as exc:
        fetch_snapshot(symbol="ARKUSDT", rest_base="https://api.binance.com", timeout_s=2, client=client)
    assert exc.value.error_class == "RATE_LIMIT"


def test_418_falls_back_to_official_market_data_host():
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        if "api.binance.com" in str(request.url):
            return httpx.Response(418, json={"msg": "banned"})
        if request.url.path.endswith("/depth"):
            return httpx.Response(200, json={"bids": [["1.0", "1"]], "asks": [["1.1", "1"]]})
        if "ticker/24hr" in str(request.url):
            return httpx.Response(200, json={"quoteVolume": "10", "lastPrice": "1.05"})
        return httpx.Response(
            200,
            json={
                "symbols": [
                    {
                        "baseAsset": "ARK",
                        "quoteAsset": "USDT",
                        "filters": [
                            {"filterType": "PRICE_FILTER", "tickSize": "0.0001"},
                            {"filterType": "LOT_SIZE", "minQty": "1", "maxQty": "1000", "stepSize": "1"},
                            {"filterType": "NOTIONAL", "minNotional": "5", "applyMinToMarket": True, "applyMaxToMarket": False},
                        ],
                    }
                ]
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    snap = fetch_snapshot(
        symbol="ARKUSDT",
        rest_base="https://api.binance.com",
        fallback_base="https://data-api.binance.vision",
        timeout_s=2,
        client=client,
        classification="LIVE",
    )
    assert snap.classification == "LIVE"
    assert snap.source.startswith("https://data-api.binance.vision")
    assert any("api.binance.com" in u for u in calls)
    assert any("data-api.binance.vision" in u for u in calls)


def test_malformed_json():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"not-json")
    client = httpx.Client(transport=httpx.MockTransport(handler))
    with pytest.raises(MarketError) as exc:
        fetch_snapshot(symbol="ARKUSDT", rest_base="https://api.binance.com", timeout_s=2, client=client)
    assert exc.value.error_class == "MALFORMED_JSON"


def test_timeout():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("timeout")
    client = httpx.Client(transport=httpx.MockTransport(handler))
    with pytest.raises(MarketError) as exc:
        fetch_snapshot(symbol="ARKUSDT", rest_base="https://api.binance.com", timeout_s=2, client=client)
    assert exc.value.error_class == "TIMEOUT"
