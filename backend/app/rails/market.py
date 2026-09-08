from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.core.book import normalize_levels
from app.core.filters import filters_from_exchange_info
from app.core.hashing import sha256_hex, snapshot_material
from app.core.schemas import MarketSnapshot
from app.logutil import get_logger

log = get_logger("market")


class MarketError(Exception):
    def __init__(self, error_class: str, message: str) -> None:
        super().__init__(message)
        self.error_class = error_class


def _get_json(client: httpx.Client, url: str, params: dict) -> dict:
    try:
        resp = client.get(url, params=params)
    except httpx.TimeoutException as exc:
        raise MarketError("TIMEOUT", str(exc)) from exc
    except httpx.TransportError as exc:
        raise MarketError("CONNECTION_FAILURE", str(exc)) from exc
    if resp.status_code == 429:
        raise MarketError("RATE_LIMIT", "HTTP 429")
    if resp.status_code == 418:
        raise MarketError("IP_BANNED", "HTTP 418")
    if resp.status_code >= 400:
        raise MarketError("HTTP_ERROR", f"HTTP {resp.status_code}")
    try:
        data = resp.json()
    except ValueError as exc:
        raise MarketError("MALFORMED_JSON", str(exc)) from exc
    if not isinstance(data, dict) and not isinstance(data, list):
        raise MarketError("MALFORMED_JSON", "unexpected payload")
    return data  # type: ignore[return-value]


def fetch_snapshot(
    *,
    symbol: str,
    rest_base: str,
    timeout_s: float,
    client: httpx.Client | None = None,
    classification: str = "LIVE",
) -> MarketSnapshot:
    own = client is None
    client = client or httpx.Client(timeout=timeout_s)
    try:
        depth = _get_json(
            client, f"{rest_base.rstrip('/')}/api/v3/depth", {"symbol": symbol, "limit": 500}
        )
        ticker = _get_json(
            client, f"{rest_base.rstrip('/')}/api/v3/ticker/24hr", {"symbol": symbol}
        )
        info = _get_json(
            client, f"{rest_base.rstrip('/')}/api/v3/exchangeInfo", {"symbol": symbol}
        )
    finally:
        if own:
            client.close()

    if not isinstance(depth, dict) or "bids" not in depth or "asks" not in depth:
        raise MarketError("MALFORMED_JSON", "depth missing bids/asks")
    if not isinstance(ticker, dict):
        raise MarketError("MALFORMED_JSON", "ticker not object")
    symbols = (info.get("symbols") if isinstance(info, dict) else None) or []
    if not symbols:
        raise MarketError("MALFORMED_JSON", "exchangeInfo missing symbol")
    filters = filters_from_exchange_info(symbols[0])
    captured = datetime.now(timezone.utc)
    bids_raw = [[str(a), str(b)] for a, b in depth.get("bids") or []]
    asks_raw = [[str(a), str(b)] for a, b in depth.get("asks") or []]
    qv = str(ticker.get("quoteVolume") or "0")
    last = str(ticker.get("lastPrice") or "0")
    material = snapshot_material(
        symbol=symbol,
        captured_at=captured,
        bids=bids_raw,
        asks=asks_raw,
        quote_volume_24h=qv,
        last_price=last,
        filters=filters.model_dump(mode="json"),
    )
    snap = MarketSnapshot(
        symbol=symbol,
        captured_at=captured,
        classification=classification,  # type: ignore[arg-type]
        source=f"{rest_base}/api/v3/depth+ticker+exchangeInfo",
        bids=normalize_levels(depth.get("bids") or [], reverse=True),
        asks=normalize_levels(depth.get("asks") or [], reverse=False),
        quote_volume_24h=Decimal(qv),
        last_price=Decimal(last),
        filters=filters,
        snapshot_hash=sha256_hex(material),
    )
    log.info(
        "snapshot",
        extra={
            "phase": "OBSERVE",
            "classification": classification,
            "elapsed_ms": 0,
        },
    )
    return snap
