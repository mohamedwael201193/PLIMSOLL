"""Public PLIMSOLL MCP (capacity/intent). No Binance secrets. No execute tool."""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from app.api.routes import CapacityIn, IntentIn, account, capacity, health, intent, oauth_status
from app.core.schemas import Constitution

router = APIRouter()

PROTOCOL = "2025-03-26"

TOOLS: list[dict[str, Any]] = [
    {
        "name": "plimsoll.health",
        "description": "Oregon health, writes flag, and whether a Binance Agent OS token is bound on this process.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "plimsoll.oauth_status",
        "description": "CIMD client id and bind state. Never returns an access token.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "plimsoll.account",
        "description": "Agentic account as Oregon sees it. Disconnected until Binance allowlists this CIMD client or a server-side token exists. Zero balances stay zero.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "plimsoll.capacity",
        "description": "Estimated exit capacity under stated constraints. LIVE only when Oregon classified the snapshot LIVE. Does not place orders.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "Spot symbol, e.g. ARKUSDT"},
                "max_exit_cost_bps": {"type": "number"},
                "max_exit_horizon_days": {"type": "number"},
                "max_participation": {"type": "number", "description": "Fraction of 24h quote volume, e.g. 0.10"},
                "max_fraction_of_visible_book": {"type": "number"},
            },
            "required": ["symbol"],
        },
    },
    {
        "name": "plimsoll.intent",
        "description": "Parse an ask and invert capacity. Backend action is authoritative. Does not place orders.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "symbol": {"type": "string"},
                "max_exit_cost_bps": {"type": "number"},
                "max_exit_horizon_days": {"type": "number"},
                "max_participation": {"type": "number"},
                "max_fraction_of_visible_book": {"type": "number"},
            },
            "required": ["text"],
        },
    },
]


def _constitution(args: dict[str, Any]) -> Constitution:
    data: dict[str, Any] = {}
    for key in (
        "max_exit_cost_bps",
        "max_exit_horizon_days",
        "max_participation",
        "max_fraction_of_visible_book",
    ):
        if key in args and args[key] is not None:
            data[key] = Decimal(str(args[key]))
    return Constitution(**data) if data else Constitution()


def _rpc_error(rpc_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": rpc_id, "error": {"code": code, "message": message}}


def _rpc_result(rpc_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": rpc_id, "result": result}


def _call_tool(name: str, args: dict[str, Any], request: Request) -> Any:
    if name == "plimsoll.health":
        return health()
    if name == "plimsoll.oauth_status":
        return oauth_status(request)
    if name == "plimsoll.account":
        return account()
    if name == "plimsoll.capacity":
        symbol = str(args.get("symbol") or "").upper()
        if not symbol:
            raise ValueError("symbol is required")
        return capacity(CapacityIn(symbol=symbol, constitution=_constitution(args)), request)
    if name == "plimsoll.intent":
        text = str(args.get("text") or "").strip()
        if not text:
            raise ValueError("text is required")
        symbol = str(args.get("symbol") or "").upper() or None
        return intent(IntentIn(text=text, symbol=symbol, constitution=_constitution(args)), request)
    raise KeyError(name)


def handle_rpc(payload: dict[str, Any], request: Request) -> dict[str, Any] | None:
    method = str(payload.get("method") or "")
    rpc_id = payload.get("id")
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    if method == "initialize":
        return _rpc_result(
            rpc_id,
            {
                "protocolVersion": PROTOCOL,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "plimsoll", "version": "0.1.0"},
                "instructions": (
                    "Deterministic exit-capacity math. Account/orders stay on official "
                    "Binance Agent OS MCP after a supported-agent bind. This server has no execute tool."
                ),
            },
        )
    if method == "notifications/initialized" or method.startswith("notifications/"):
        return None
    if method == "tools/list":
        return _rpc_result(rpc_id, {"tools": TOOLS})
    if method == "ping":
        return _rpc_result(rpc_id, {})
    if method == "tools/call":
        name = str(params.get("name") or "")
        arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
        try:
            data = _call_tool(name, arguments, request)
        except KeyError:
            return _rpc_error(rpc_id, -32601, f"Unknown tool {name}")
        except ValueError as exc:
            return _rpc_error(rpc_id, -32602, str(exc)[:240])
        except Exception as exc:
            return _rpc_error(rpc_id, -32000, f"{type(exc).__name__}: {str(exc)[:200]}")
        return _rpc_result(
            rpc_id,
            {
                "content": [{"type": "text", "text": json.dumps(data, default=str)}],
                "structuredContent": data,
            },
        )
    if rpc_id is None:
        return None
    return _rpc_error(rpc_id, -32601, f"Unknown method {method}")


@router.get("/mcp")
def mcp_get() -> JSONResponse:
    return JSONResponse(
        {"error": "Use POST JSON-RPC (initialize, tools/list, tools/call).", "protocol": PROTOCOL},
        status_code=405,
        headers={"Allow": "POST"},
    )


@router.post("/mcp")
async def mcp_post(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(_rpc_error(None, -32700, "Parse error"), status_code=400)
    if not isinstance(payload, dict):
        return JSONResponse(_rpc_error(None, -32600, "Invalid request"), status_code=400)
    result = handle_rpc(payload, request)
    if result is None:
        return Response(status_code=202)
    return JSONResponse(result)
