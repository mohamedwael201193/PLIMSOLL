from __future__ import annotations

import os

os.environ["DATABASE_URL"] = ""
os.environ["DIRECT_URL"] = ""
os.environ["WRITES_ENABLED"] = "false"
os.environ["KILL_SWITCH"] = "false"
os.environ["BINANCE_MCP_ACCESS_TOKEN"] = ""

from datetime import datetime
from decimal import Decimal

from app.config import get_settings
from app.core.book import normalize_levels
from app.core.hashing import sha256_hex
from app.core.schemas import Constitution, MarketSnapshot, SymbolFilters

get_settings.cache_clear()


def ts(iso: str = "2026-09-08T01:00:00+00:00") -> datetime:
    return datetime.fromisoformat(iso)


def filters(**kw) -> SymbolFilters:
    base = SymbolFilters(
        tick_size=Decimal("0.0001"),
        lot_min=Decimal("1"),
        lot_max=Decimal("1000000"),
        lot_step=Decimal("1"),
        market_lot_min=Decimal("1"),
        market_lot_max=Decimal("100000"),
        market_lot_step=Decimal("1"),
        min_notional=Decimal("5"),
        apply_min_to_market=True,
        apply_max_to_market=False,
    )
    return base.model_copy(update=kw)


def snapshot(
    *,
    bids: list[tuple[str, str]] | None = None,
    asks: list[tuple[str, str]] | None = None,
    quote_volume: str = "100000",
    last: str = "1.0001",
    captured: datetime | None = None,
    classification: str = "REPLAY",
    filt: SymbolFilters | None = None,
    symbol: str = "ARKUSDT",
) -> MarketSnapshot:
    captured = captured or ts()
    default_bids: list[tuple[str, str]] = [("1.0000", "10000")]
    default_asks: list[tuple[str, str]] = [("1.0002", "10000")]
    b = normalize_levels(bids if bids is not None else default_bids, reverse=True)
    a = normalize_levels(asks if asks is not None else default_asks, reverse=False)
    raw_hash = sha256_hex(f"{symbol}:{captured.isoformat()}:{bids}:{asks}:{quote_volume}:{last}")
    return MarketSnapshot(
        symbol=symbol,
        captured_at=captured,
        classification=classification,  # type: ignore[arg-type]
        source="fixture",
        bids=b,
        asks=a,
        quote_volume_24h=Decimal(quote_volume),
        last_price=Decimal(last),
        filters=filt or filters(),
        snapshot_hash=raw_hash,
    )


CONST = Constitution()
