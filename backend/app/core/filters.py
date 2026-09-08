from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.core.schemas import SymbolFilters


def filters_from_exchange_info(symbol_info: dict[str, Any]) -> SymbolFilters:
    f = {item["filterType"]: item for item in symbol_info.get("filters") or [] if "filterType" in item}
    lot = f.get("LOT_SIZE") or {}
    mlot = f.get("MARKET_LOT_SIZE") or lot
    notion = f.get("NOTIONAL") or {}
    min_n = f.get("MIN_NOTIONAL") or {}
    price = f.get("PRICE_FILTER") or {}
    min_notional = Decimal(str(notion.get("minNotional") or min_n.get("minNotional") or "0"))
    max_notional = notion.get("maxNotional")
    apply_min = notion.get("applyMinToMarket")
    if apply_min is None:
        apply_min = min_n.get("applyToMarket", True)
    apply_max = bool(notion.get("applyMaxToMarket", False))
    return SymbolFilters(
        tick_size=Decimal(str(price.get("tickSize") or "0.0001")),
        lot_min=Decimal(str(lot.get("minQty") or "0")),
        lot_max=Decimal(str(lot.get("maxQty") or "1e18")),
        lot_step=Decimal(str(lot.get("stepSize") or "0.00000001")),
        market_lot_min=Decimal(str(mlot.get("minQty") or "0")),
        market_lot_max=Decimal(str(mlot.get("maxQty") or "1e18")),
        market_lot_step=Decimal(str(mlot.get("stepSize") or "0.00000001")),
        min_notional=min_notional,
        max_notional=Decimal(str(max_notional)) if max_notional is not None else None,
        apply_min_to_market=bool(apply_min),
        apply_max_to_market=apply_max,
        base_asset=str(symbol_info.get("baseAsset") or ""),
        quote_asset=str(symbol_info.get("quoteAsset") or "USDT"),
    )
