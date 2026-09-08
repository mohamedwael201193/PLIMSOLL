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


def test_418_is_ip_banned():
    client = httpx.Client(transport=_transport(418, {"msg": "banned"}))
    with pytest.raises(MarketError) as exc:
        fetch_snapshot(symbol="ARKUSDT", rest_base="https://api.binance.com", timeout_s=2, client=client)
    assert exc.value.error_class == "IP_BANNED"


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
