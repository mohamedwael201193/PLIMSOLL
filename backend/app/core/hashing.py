from __future__ import annotations

import hashlib
import json
from datetime import datetime
from decimal import Decimal
from typing import Any


def snapshot_material(
    *,
    symbol: str,
    captured_at: datetime,
    bids: list[list[str]],
    asks: list[list[str]],
    quote_volume_24h: str,
    last_price: str,
    filters: dict[str, Any],
) -> str:
    blob = {
        "symbol": symbol,
        "captured_at": captured_at.isoformat(),
        "bids": bids,
        "asks": asks,
        "quote_volume_24h": quote_volume_24h,
        "last_price": last_price,
        "filters": filters,
    }
    return json.dumps(blob, separators=(",", ":"), sort_keys=True)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def client_order_id(intent_id: str, slice_index: int = 0) -> str:
    digest = sha256_hex(f"{intent_id}:{slice_index}")[:16]
    return f"plim_{digest}"


def dec_str(value: Decimal) -> str:
    return format(value, "f")
