from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.agent.approval import issue_approval, validate_approval
from app.agent.execute import parse_order_payload, place_spot_market
from app.agent.intent import parse_intent
from app.agent.loop import run_once
from app.agent.reconcile import reconcile, redact_account
from app.agent.resolve import re_solve
from app.config import get_settings
from app.core.capacity import estimate_exit_capacity
from app.core.schemas import Constitution, Decision, LegalOrder, MarketSnapshot, Position, utcnow
from app.logutil import get_logger
from app.rails.market import MarketError, fetch_snapshot
from app.rails.mcp import McpError, McpSession
from app.state.db import ping
from app.state.models import FillRow, SnapshotRow
from app.state.snapshots import persist_snapshot
import httpx

router = APIRouter()
log = get_logger("api")
_memory_approvals: dict[str, Any] = {}
_last_capacity: dict[str, Decimal] = {}
_positions: dict[str, Position] = {}
BOOK_PREVIEW = 32


def market_preview(snap: MarketSnapshot, n: int = BOOK_PREVIEW) -> dict[str, Any]:
    """Classified live/replay book slice for charts. Never invents levels."""
    return {
        "symbol": snap.symbol,
        "classification": snap.classification,
        "source": snap.source,
        "captured_at": snap.captured_at.isoformat(),
        "last_price": str(snap.last_price),
        "quote_volume_24h": str(snap.quote_volume_24h),
        "best_bid": str(snap.bids[0].price) if snap.bids else None,
        "best_ask": str(snap.asks[0].price) if snap.asks else None,
        "bids": [{"price": str(lvl.price), "quantity": str(lvl.quantity)} for lvl in snap.bids[:n]],
        "asks": [{"price": str(lvl.price), "quantity": str(lvl.quantity)} for lvl in snap.asks[:n]],
        "filters": {
            "min_notional": str(snap.filters.min_notional),
            "lot_min": str(snap.filters.lot_min),
            "lot_step": str(snap.filters.lot_step),
            "base_asset": snap.filters.base_asset,
            "quote_asset": snap.filters.quote_asset,
        },
    }


class CapacityIn(BaseModel):
    symbol: str
    constitution: Constitution = Field(default_factory=Constitution)
    position: Position | None = None
    replay: MarketSnapshot | None = None


class IntentIn(BaseModel):
    text: str
    symbol: str | None = None
    constitution: Constitution = Field(default_factory=Constitution)
    position: Position | None = None
    replay: MarketSnapshot | None = None


class ApproveIn(BaseModel):
    decision: dict[str, Any]
    ttl_s: int = 30


class ExecuteIn(BaseModel):
    confirm: str
    confirmation_token: str
    snapshot_hash: str
    intent_id: str = "manual"
    symbol: str
    side: str = "BUY"
    quote_order_qty: str | None = None
    quantity: str | None = None


class ResolveIn(BaseModel):
    symbol: str
    constitution: Constitution = Field(default_factory=Constitution)
    position: Position | None = None
    replay: MarketSnapshot | None = None


def _snap(symbol: str, replay: MarketSnapshot | None) -> MarketSnapshot:
    if replay is not None:
        replay.classification = "REPLAY"
        return replay
    settings = get_settings()
    try:
        return fetch_snapshot(
            symbol=symbol.upper(),
            rest_base=settings.binance_rest_base,
            timeout_s=settings.http_timeout_s,
            classification="LIVE",
            fallback_base=settings.binance_rest_fallback,
        )
    except MarketError as exc:
        raise HTTPException(
            status_code=503,
            detail={"error_class": exc.error_class, "classification": "LIVE"},
        ) from exc


def _persist(request: Request, snap: MarketSnapshot) -> None:
    factory = getattr(request.app.state, "db_session", None)
    if factory is None:
        return
    sess = factory()
    try:
        persist_snapshot(sess, snap)
    except Exception as exc:
        log.info("snapshot_persist_skipped", extra={"error_class": type(exc).__name__, "phase": "OBSERVE"})
    finally:
        sess.close()


@router.get("/health")
def health() -> dict[str, Any]:
    s = get_settings()
    return {
        "ok": True,
        "app": s.app_name,
        "writes_enabled": s.writes_enabled,
        "kill_switch": s.kill_switch,
        "time": utcnow().isoformat(),
    }


@router.get("/ready")
def ready(request: Request) -> dict[str, Any]:
    engine = getattr(request.app.state, "engine", None)
    db_ok = False
    if engine is not None:
        try:
            db_ok = ping(engine)
        except Exception as exc:
            log.info("ready_db_down", extra={"error_class": type(exc).__name__})
            db_ok = False
    return {
        "ok": db_ok or engine is None,
        "database": "UP" if db_ok else ("SKIP" if engine is None else "DOWN"),
    }


@router.post("/v1/capacity")
def capacity(body: CapacityIn, request: Request) -> dict[str, Any]:
    snap = _snap(body.symbol, body.replay)
    cap = estimate_exit_capacity(snap, body.constitution)
    _persist(request, snap)
    prev = _last_capacity.get(snap.symbol)
    collapsed = prev is not None and cap.estimated_exit_capacity_notional < prev
    _last_capacity[snap.symbol] = cap.estimated_exit_capacity_notional
    held = None
    over = False
    if body.position and body.position.base_qty > 0:
        from app.core.book import mid_price

        mid = mid_price(snap)
        if mid:
            held = body.position.base_qty * mid
            over = held > cap.estimated_exit_capacity_notional
    return {
        "classification": snap.classification,
        "snapshot_hash": snap.snapshot_hash,
        "captured_at": snap.captured_at.isoformat(),
        "source": snap.source,
        "capacity": cap.model_dump(mode="json"),
        "market": market_preview(snap),
        "capacity_collapsed": collapsed,
        "held_notional": str(held) if held is not None else None,
        "over_capacity": over,
        "language": "estimated exit capacity under stated constraints",
    }


@router.post("/v1/intent")
def intent(body: IntentIn, request: Request) -> dict[str, Any]:
    parsed = parse_intent(body.text)
    symbol = body.symbol or parsed.symbol
    if not symbol:
        return {
            "classification": "UNKNOWN",
            "intent": parsed.model_dump(mode="json"),
            "needs_clarification": True,
        }
    snap = _snap(symbol, body.replay)
    _persist(request, snap)
    decision = run_once(
        text=body.text,
        snapshot=snap,
        constitution=body.constitution,
        position=body.position,
        previous_capacity=_last_capacity.get(snap.symbol),
    )
    _last_capacity[snap.symbol] = decision.capacity.estimated_exit_capacity_notional
    if body.position:
        _positions[snap.symbol] = body.position
    return {
        "classification": snap.classification,
        "snapshot_hash": snap.snapshot_hash,
        "captured_at": snap.captured_at.isoformat(),
        "source": snap.source,
        "decision": decision.model_dump(mode="json"),
        "market": market_preview(snap),
    }


@router.post("/v1/approvals")
def approvals(body: ApproveIn) -> dict[str, Any]:
    decision = Decision.model_validate(body.decision)
    approval = issue_approval(decision, ttl_s=body.ttl_s)
    _memory_approvals[approval.confirmation_token] = approval
    return {
        "approval_id": approval.approval_id,
        "expires_at": approval.expires_at.isoformat(),
        "snapshot_hash": approval.snapshot_hash,
        "confirmation_token": approval.confirmation_token,
        "note": "Financial write still requires the operator to type CONFIRM. Token is not sufficient alone.",
    }


@router.post("/v1/resolve")
def resolve(body: ResolveIn, request: Request) -> dict[str, Any]:
    snap = _snap(body.symbol, body.replay)
    _persist(request, snap)
    position = body.position or _positions.get(snap.symbol) or Position(symbol=snap.symbol)
    decision = re_solve(
        snapshot=snap,
        constitution=body.constitution,
        position=position,
        previous_capacity=_last_capacity.get(snap.symbol),
    )
    prev = _last_capacity.get(snap.symbol)
    collapsed = prev is not None and decision.capacity.estimated_exit_capacity_notional < prev
    _last_capacity[snap.symbol] = decision.capacity.estimated_exit_capacity_notional
    _positions[snap.symbol] = position
    return {
        "classification": snap.classification,
        "snapshot_hash": snap.snapshot_hash,
        "captured_at": snap.captured_at.isoformat(),
        "source": snap.source,
        "capacity_collapsed": collapsed,
        "decision": decision.model_dump(mode="json"),
        "market": market_preview(snap),
        "language": "estimated exit capacity under stated constraints",
    }


@router.get("/v1/market/{symbol}")
def get_market(symbol: str, request: Request) -> dict[str, Any]:
    snap = _snap(symbol.upper(), None)
    _persist(request, snap)
    return {
        "classification": snap.classification,
        "snapshot_hash": snap.snapshot_hash,
        "market": market_preview(snap),
        "language": "estimated exit capacity under stated constraints",
    }


@router.get("/v1/snapshots/{symbol}")
def list_snapshots(symbol: str, request: Request, limit: int = 32) -> dict[str, Any]:
    factory = getattr(request.app.state, "db_session", None)
    if factory is None:
        return {
            "symbol": symbol.upper(),
            "observations": [],
            "note": "database not attached this process",
        }
    cap = max(1, min(int(limit), 64))
    sess = factory()
    try:
        rows = (
            sess.query(SnapshotRow)
            .filter(SnapshotRow.symbol == symbol.upper())
            .filter(SnapshotRow.classification == "LIVE")
            .order_by(SnapshotRow.captured_at.desc())
            .limit(cap)
            .all()
        )
        observations = []
        for row in reversed(rows):
            ticker = row.ticker or {}
            observations.append(
                {
                    "captured_at": row.captured_at.isoformat() if row.captured_at else None,
                    "classification": row.classification,
                    "last_price": ticker.get("lastPrice"),
                    "quote_volume_24h": ticker.get("quoteVolume"),
                    "snapshot_hash": row.hash,
                }
            )
        return {"symbol": symbol.upper(), "observations": observations}
    finally:
        sess.close()


@router.get("/v1/fills")
def list_fills(request: Request, limit: int = 20) -> dict[str, Any]:
    factory = getattr(request.app.state, "db_session", None)
    if factory is None:
        return {"fills": [], "note": "database not attached this process"}
    cap = max(1, min(int(limit), 50))
    sess = factory()
    try:
        rows = sess.query(FillRow).order_by(FillRow.id.desc()).limit(cap).all()
        fills = [
            {
                "client_order_id": row.client_order_id,
                "order_id": row.order_id,
                "status": row.status,
                "executed_qty": str(row.executed_qty),
                "cumm_quote": str(row.cumm_quote),
            }
            for row in reversed(rows)
            if row.order_id
        ]
        return {"fills": fills}
    finally:
        sess.close()


@router.get("/v1/positions/{symbol}")
def get_position(symbol: str) -> dict[str, Any]:
    pos = _positions.get(symbol.upper())
    cap = _last_capacity.get(symbol.upper())
    return {
        "symbol": symbol.upper(),
        "position": pos.model_dump(mode="json") if pos else None,
        "last_estimated_exit_capacity_notional": str(cap) if cap is not None else None,
    }


@router.post("/v1/execute")
def execute(
    body: ExecuteIn,
    request: Request,
    x_plimsoll_confirm: str | None = Header(default=None, alias="X-PLIMSOLL-CONFIRM"),
) -> dict[str, Any]:
    settings = get_settings()
    if settings.kill_switch:
        raise HTTPException(status_code=403, detail={"error_class": "HALTED", "state": "HALTED"})
    approval = _memory_approvals.get(body.confirmation_token)
    if approval is None:
        raise HTTPException(status_code=400, detail={"error_class": "UNKNOWN_APPROVAL"})
    err = validate_approval(
        approval,
        snapshot_hash=body.snapshot_hash,
        confirm_text=body.confirm if body.confirm == "CONFIRM" else (x_plimsoll_confirm or ""),
        writes_enabled=settings.writes_enabled,
    )
    if err:
        raise HTTPException(status_code=403, detail={"error_class": err})
    if not settings.binance_mcp_access_token:
        raise HTTPException(
            status_code=503,
            detail={"error_class": "MCP_TOKEN_MISSING", "classification": "UNKNOWN"},
        )
    session = McpSession(settings.binance_mcp_url, settings.binance_mcp_access_token)
    with httpx.Client(timeout=settings.http_timeout_s) as client:
        try:
            session.discover(client)
        except McpError as exc:
            raise HTTPException(status_code=503, detail={"error_class": exc.error_class}) from exc
        cap_new = session.capabilities.get("CAP_NEW_SPOT_ORDER")
        cap_get = session.capabilities.get("CAP_GET_ORDER")
        if not cap_new or not cap_get:
            raise HTTPException(
                status_code=503,
                detail={"error_class": "CAPABILITY_MISSING", "have": list(session.capabilities)},
            )
        order = LegalOrder(
            symbol=body.symbol.upper(),
            side=body.side,  # type: ignore[arg-type]
            type="MARKET",
            quantity=Decimal(body.quantity) if body.quantity else None,
            quote_order_qty=Decimal(body.quote_order_qty) if body.quote_order_qty else None,
            notional=Decimal("0"),
        )
        try:
            placed = place_spot_market(
                session,
                client,
                cap_new=cap_new,
                order=order,
                intent_id=body.intent_id,
                slice_index=0,
                confirm="CONFIRM",
                writes_enabled=True,
            )
        except McpError as exc:
            raise HTTPException(status_code=400, detail={"error_class": exc.error_class}) from exc
        fill = parse_order_payload(placed["result"])
        readback = None
        if fill.order_id:
            try:
                readback = session.call(
                    client,
                    cap_get,
                    {"symbol": body.symbol.upper(), "orderId": int(fill.order_id)},
                )
            except McpError as exc:
                readback = {"error_class": exc.error_class}
        elif fill.client_order_id:
            try:
                readback = session.call(
                    client,
                    cap_get,
                    {"symbol": body.symbol.upper(), "origClientOrderId": fill.client_order_id},
                )
            except McpError as exc:
                readback = {"error_class": exc.error_class}
        acct = None
        cap_acct = session.capabilities.get("CAP_ACCOUNT")
        if cap_acct:
            try:
                raw = session.call(client, cap_acct, {"omitZeroBalances": True})
                acct = redact_account(raw)
            except McpError as exc:
                acct = {"error_class": exc.error_class}
    rec = reconcile(
        fill,
        requested_qty=Decimal(body.quantity) if body.quantity else fill.orig_qty,
        requested_quote=Decimal(body.quote_order_qty) if body.quote_order_qty else None,
    )
    approval.status = "USED"
    factory = getattr(request.app.state, "db_session", None)
    if factory is not None:
        from app.state.ledger import record_fill

        sess = factory()
        try:
            record_fill(sess, fill, placed.get("result") if isinstance(placed.get("result"), dict) else {})
        except Exception as exc:
            log.info("fill_persist_skipped", extra={"error_class": type(exc).__name__})
        finally:
            sess.close()
    return {
        "classification": "LIVE",
        "client_order_id": placed["client_order_id"],
        "duplicate_suppressed": placed.get("duplicate_suppressed", False),
        "fill": fill.model_dump(mode="json"),
        "reconciliation": rec,
        "readback_present": readback is not None,
        "account_read_present": acct is not None,
        "account": acct,
        "partial": fill.partial,
    }


@router.get("/v1/mcp/capabilities")
def mcp_caps() -> dict[str, Any]:
    settings = get_settings()
    if not settings.binance_mcp_access_token:
        return {
            "classification": "UNKNOWN",
            "bound": False,
            "reason": "BINANCE_MCP_ACCESS_TOKEN unset",
        }
    session = McpSession(settings.binance_mcp_url, settings.binance_mcp_access_token)
    with httpx.Client(timeout=settings.http_timeout_s) as client:
        session.discover(client)
    return {
        "classification": "LIVE",
        "bound": True,
        "capabilities": session.capabilities,
        "tool_count": len(session.tools),
        "writes_enabled": settings.writes_enabled,
        "kill_switch": settings.kill_switch,
    }
