from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
import json

import httpx

from app.core.book import normalize_levels
from app.core.filters import filters_from_exchange_info
from app.core.hashing import sha256_hex, snapshot_material
from app.core.schemas import MarketSnapshot
from app.logutil import get_logger

OFFICIAL_REST_ALTERNATES = (
    "https://data-api.binance.vision",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api4.binance.com",
    "https://api-gcp.binance.com",
)

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
    fallback_base: str | None = None,
) -> MarketSnapshot:
    own = client is None
    client = client or httpx.Client(timeout=timeout_s)
    bases = [rest_base.rstrip("/")]
    extras = []
    if fallback_base:
        extras.append(fallback_base.rstrip("/"))
    extras.extend(OFFICIAL_REST_ALTERNATES)
    for extra in extras:
        if extra and extra not in bases:
            bases.append(extra)
    last_error: MarketError | None = None
    try:
        for i, base in enumerate(bases):
            try:
                return _fetch_one(
                    client=client,
                    symbol=symbol,
                    rest_base=base,
                    classification=classification,
                )
            except MarketError as exc:
                last_error = exc
                retryable = exc.error_class in {
                    "IP_BANNED",
                    "HTTP_ERROR",
                    "CONNECTION_FAILURE",
                    "TIMEOUT",
                }
                if retryable and i < len(bases) - 1:
                    log.info(
                        "market_fallback",
                        extra={
                            "error_class": exc.error_class,
                            "phase": "OBSERVE",
                            "classification": classification,
                        },
                    )
                    continue
                raise
        assert last_error is not None
        raise last_error
    finally:
        if own:
            client.close()


def _fetch_one(
    *,
    client: httpx.Client,
    symbol: str,
    rest_base: str,
    classification: str,
) -> MarketSnapshot:
    depth = _get_json(client, f"{rest_base}/api/v3/depth", {"symbol": symbol, "limit": 500})
    ticker = _get_json(client, f"{rest_base}/api/v3/ticker/24hr", {"symbol": symbol})
    info = _get_json(client, f"{rest_base}/api/v3/exchangeInfo", {"symbol": symbol})
    if not isinstance(depth, dict) or "bids" not in depth or "asks" not in depth:
        raise MarketError("MALFORMED_JSON", "depth missing bids/asks")
    if not isinstance(ticker, dict):
        raise MarketError("MALFORMED_JSON", "ticker not object")
    symbols = (info.get("symbols") if isinstance(info, dict) else None) or []
    if not symbols:
        raise MarketError("MALFORMED_JSON", "exchangeInfo missing symbol")
    info_sym = symbols[0]
    status = str(info_sym.get("status") or "")
    if status != "TRADING":
        raise MarketError("NOT_TRADING", f"{symbol} status={status or 'unknown'}")
    if info_sym.get("isSpotTradingAllowed") is False:
        raise MarketError("NOT_TRADING", f"{symbol} spot trading not allowed")
    filters = filters_from_exchange_info(info_sym)
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


def fetch_tickers(
    symbols: list[str],
    *,
    rest_base: str,
    timeout_s: float,
    fallback_base: str | None = None,
    client: httpx.Client | None = None,
    classification: str = "LIVE",
) -> dict:
    """Public 24h tickers only. Never invents prices; raises MarketError if every host fails."""
    own = client is None
    client = client or httpx.Client(timeout=timeout_s)
    bases = [rest_base]
    if fallback_base:
        bases.append(fallback_base)
    for b in OFFICIAL_REST_ALTERNATES:
        if b not in bases:
            bases.append(b)
    last_error: MarketError | None = None
    try:
        for i, base in enumerate(bases):
            try:
                if len(symbols) == 1:
                    raw = _get_json(client, f"{base}/api/v3/ticker/24hr", {"symbol": symbols[0]})
                    rows = [raw] if isinstance(raw, dict) else []
                else:
                    raw = _get_json(
                        client,
                        f"{base}/api/v3/ticker/24hr",
                        {"symbols": json.dumps(symbols, separators=(",", ":"))},
                    )
                    rows = raw if isinstance(raw, list) else []
                out = []
                for t in rows:
                    if not isinstance(t, dict) or not t.get("symbol"):
                        continue
                    out.append(
                        {
                            "symbol": t["symbol"],
                            "last": float(t.get("lastPrice") or 0),
                            "change": float(t.get("priceChangePercent") or 0),
                            "quoteVolume": float(t.get("quoteVolume") or 0),
                            "high": float(t.get("highPrice") or 0),
                            "low": float(t.get("lowPrice") or 0),
                        }
                    )
                if not out:
                    raise MarketError("MALFORMED_JSON", "empty ticker payload")
                return {
                    "classification": classification,
                    "source": f"{base}/api/v3/ticker/24hr",
                    "rows": out,
                }
            except MarketError as exc:
                last_error = exc
                retryable = exc.error_class in {
                    "IP_BANNED",
                    "HTTP_ERROR",
                    "CONNECTION_FAILURE",
                    "TIMEOUT",
                }
                if retryable and i < len(bases) - 1:
                    continue
                raise
        assert last_error is not None
        raise last_error
    finally:
        if own:
            client.close()


_UNIVERSE_TTL_S = 90.0
_universe_cache: dict | None = None
_universe_cached_at = 0.0


def fetch_spot_universe(
    *,
    rest_base: str,
    timeout_s: float,
    fallback_base: str | None = None,
    client: httpx.Client | None = None,
    classification: str = "LIVE",
) -> dict:
    """TRADING USDT Spot pairs from live exchangeInfo. Cached briefly. Never invents symbols."""
    global _universe_cache, _universe_cached_at
    now = datetime.now(timezone.utc).timestamp()
    if _universe_cache is not None and now - _universe_cached_at < _UNIVERSE_TTL_S:
        return _universe_cache

    own = client is None
    client = client or httpx.Client(timeout=timeout_s)
    bases = [rest_base.rstrip("/")]
    extras: list[str] = []
    if fallback_base:
        extras.append(fallback_base.rstrip("/"))
    extras.extend(OFFICIAL_REST_ALTERNATES)
    for extra in extras:
        if extra and extra not in bases:
            bases.append(extra)
    last_error: MarketError | None = None
    try:
        for i, base in enumerate(bases):
            try:
                info = _get_json(client, f"{base}/api/v3/exchangeInfo", {})
                raw_syms = info.get("symbols") if isinstance(info, dict) else None
                if not isinstance(raw_syms, list) or not raw_syms:
                    raise MarketError("MALFORMED_JSON", "exchangeInfo missing symbols")
                rows = []
                for item in raw_syms:
                    if not isinstance(item, dict):
                        continue
                    if item.get("status") != "TRADING":
                        continue
                    if item.get("isSpotTradingAllowed") is False:
                        continue
                    quote = str(item.get("quoteAsset") or "")
                    symbol = str(item.get("symbol") or "")
                    if quote != "USDT" or not symbol.endswith("USDT"):
                        continue
                    filt = filters_from_exchange_info(item)
                    rows.append(
                        {
                            "symbol": symbol,
                            "base": str(item.get("baseAsset") or symbol.replace("USDT", "")),
                            "quote": quote,
                            "status": "TRADING",
                            "min_notional": str(filt.min_notional),
                            "lot_min": str(filt.lot_min),
                            "lot_step": str(filt.lot_step),
                            "tick_size": str(filt.tick_size),
                        }
                    )
                if not rows:
                    raise MarketError("MALFORMED_JSON", "no TRADING USDT spot pairs")
                body = {
                    "classification": classification,
                    "source": f"{base}/api/v3/exchangeInfo",
                    "captured_at": datetime.now(timezone.utc).isoformat(),
                    "count": len(rows),
                    "note": (
                        "Currently tradable Spot USDT pairs from live Binance exchange metadata. "
                        "Not a claim that every listed coin is supported forever."
                    ),
                    "symbols": rows,
                }
                _universe_cache = body
                _universe_cached_at = datetime.now(timezone.utc).timestamp()
                return body
            except MarketError as exc:
                last_error = exc
                retryable = exc.error_class in {
                    "IP_BANNED",
                    "HTTP_ERROR",
                    "CONNECTION_FAILURE",
                    "TIMEOUT",
                }
                if retryable and i < len(bases) - 1:
                    continue
                raise
        assert last_error is not None
        raise last_error
    finally:
        if own:
            client.close()
