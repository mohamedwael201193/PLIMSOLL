from __future__ import annotations

import json
from typing import Any

import httpx

from app.logutil import get_logger

log = get_logger("mcp")

WRITE_HINTS = (
    "neworder",
    "new order",
    "place",
    "cancel",
    "accept",
    "transfer",
    "borrow",
    "repay",
    "execute any visible",
)


class McpError(Exception):
    def __init__(self, error_class: str, message: str) -> None:
        super().__init__(message)
        self.error_class = error_class


def _parse(resp: httpx.Response) -> Any:
    ctype = (resp.headers.get("content-type") or "").lower()
    if "text/event-stream" in ctype:
        payloads = []
        for line in resp.text.splitlines():
            if line.startswith("data:"):
                data = line[5:].strip()
                if data and data != "[DONE]":
                    payloads.append(json.loads(data))
        return payloads[-1] if payloads else None
    if not resp.content:
        return None
    return resp.json()


class McpSession:
    def __init__(self, url: str, token: str, timeout_s: float = 20.0) -> None:
        self.url = url
        self.token = token
        self.timeout_s = timeout_s
        self.session_id: str | None = None
        self.tools: dict[str, dict[str, Any]] = {}
        self.capabilities: dict[str, str] = {}

    def _headers(self) -> dict[str, str]:
        h = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": "2025-03-26",
        }
        if self.session_id:
            h["Mcp-Session-Id"] = self.session_id
        return h

    def _post(self, client: httpx.Client, payload: dict[str, Any]) -> Any:
        try:
            resp = client.post(self.url, headers=self._headers(), json=payload)
        except httpx.HTTPError as exc:
            raise McpError("CONNECTION_FAILURE", str(exc)) from exc
        if resp.status_code >= 400:
            raise McpError("HTTP_ERROR", f"HTTP {resp.status_code}")
        sid = resp.headers.get("mcp-session-id")
        if sid:
            self.session_id = sid
        body = _parse(resp)
        if isinstance(body, dict) and body.get("error"):
            raise McpError("RPC_ERROR", str(body["error"].get("message"))[:240])
        return body

    def discover(self, client: httpx.Client) -> None:
        self._post(
            client,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "plimsoll", "version": "0.1.0"},
                },
            },
        )
        self._post(client, {"jsonrpc": "2.0", "method": "notifications/initialized"})
        cursor = None
        rpc_id = 2
        while True:
            params: dict[str, Any] = {}
            if cursor:
                params["cursor"] = cursor
            body = self._post(
                client,
                {"jsonrpc": "2.0", "id": rpc_id, "method": "tools/list", "params": params},
            )
            rpc_id += 1
            result = (body or {}).get("result") or {}
            for tool in result.get("tools") or []:
                name = tool.get("name")
                if name:
                    self.tools[name] = tool
            cursor = result.get("nextCursor")
            if not cursor:
                break
        self.capabilities = bind_capabilities(self.tools)
        log.info(
            "mcp_discovered",
            extra={"capability": ",".join(sorted(self.capabilities)), "phase": "OBSERVE"},
        )

    def call(self, client: httpx.Client, name: str, arguments: dict[str, Any], rpc_id: int = 99) -> Any:
        if name not in self.tools:
            raise McpError("MISSING_TOOL", name)
        body = self._post(
            client,
            {
                "jsonrpc": "2.0",
                "id": rpc_id,
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments},
            },
        )
        result = (body or {}).get("result") or {}
        structured = result.get("structuredContent") or result.get("structured_content")
        if structured is not None:
            return structured
        for item in result.get("content") or []:
            if isinstance(item, dict) and item.get("type") == "text":
                try:
                    return json.loads(item.get("text") or "{}")
                except json.JSONDecodeError:
                    return {"text": item.get("text")}
        return result


def bind_capabilities(tools: dict[str, dict[str, Any]]) -> dict[str, str]:
    caps: dict[str, str] = {}
    for name, tool in tools.items():
        desc = f"{name} {tool.get('description') or ''}".lower()
        if name == "spot.getAccount" or ("getaccount" in name.lower() and "spot" in name.lower()):
            caps.setdefault("CAP_ACCOUNT", name)
        if "walletbalance" in name.lower() or name == "wallet.queryUserWalletBalance":
            caps.setdefault("CAP_BALANCES", name)
        if name == "spot.newOrder" or ("neworder" in name.lower() and "spot" in name.lower()):
            caps.setdefault("CAP_NEW_SPOT_ORDER", name)
        if name == "spot.getOrder" or (name.endswith("getOrder") and "spot" in name.lower()):
            caps.setdefault("CAP_GET_ORDER", name)
        if name == "spot.getOpenOrders":
            caps.setdefault("CAP_OPEN_ORDERS", name)
        if name == "spot.deleteOrder":
            caps.setdefault("CAP_CANCEL_ORDER", name)
        if name == "spot.depth":
            caps.setdefault("CAP_MARKET_DEPTH", name)
        if name == "spot.ticker24hr":
            caps.setdefault("CAP_MARKET_TICKER", name)
        if any(h in desc for h in WRITE_HINTS) and "CAP_WRITE_SURFACE" not in caps:
            if "neworder" in name.lower() or name == "tool_execute":
                caps["CAP_WRITE_SURFACE"] = name
    return caps


def is_write_tool(name: str, tool: dict[str, Any] | None = None) -> bool:
    blob = f"{name} {(tool or {}).get('description') or ''}".lower()
    return any(h in blob.replace(" ", "") for h in ("neworder", "deleteorder", "acceptquote", "tool_execute", "transfer"))
