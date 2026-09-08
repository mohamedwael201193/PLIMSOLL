"""Official Binance Agent OS OAuth (CIMD + PKCE). Tokens stay in process memory.

Never log access tokens. Never send them to the browser.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.config import get_settings
from app.core.schemas import utcnow
from app.logutil import get_logger

log = get_logger("oauth")

AS_METADATA_URL = "https://agent.binance.com/.well-known/oauth-authorization-server"
MCP_RESOURCE = "https://agent.binance.com/mcp/agentic"
OAUTH_SCOPE = "mcp:account:read mcp:spot:trade mcp:master:read"
PENDING_TTL_S = 600
NOT_CONNECTED_REASON = (
    "No Agent OS session on Oregon. Binance did not authorize this web client "
    "(unsupported AI agent 3346001). Use a supported Agent such as Codex, Claude, Cursor, "
    "VS Code, or ChatGPT. The browser never receives the token."
)
OAUTH_STATUS_NOTE = (
    "Official Agent OS OAuth (CIMD + PKCE) is implemented. Binance currently requires a "
    "supported Agent client (3346001). Tokens never leave Oregon."
)

_lock = threading.Lock()
_access_token = ""
_bound_at: str | None = None
_pending: dict[str, "_Pending"] = {}


@dataclass
class _Pending:
    verifier: str
    origin: str
    created: float


def current_mcp_token() -> str:
    with _lock:
        if _access_token:
            return _access_token
    return (get_settings().binance_mcp_access_token or "").strip()


def token_source() -> str:
    with _lock:
        if _access_token:
            return "OAUTH_RUNTIME"
    if (get_settings().binance_mcp_access_token or "").strip():
        return "ENV"
    return "NONE"


def set_runtime_token(token: str) -> None:
    global _access_token, _bound_at
    with _lock:
        _access_token = (token or "").strip()
        _bound_at = utcnow().isoformat() if _access_token else None


def reset_oauth_state() -> None:
    global _access_token, _bound_at, _pending
    with _lock:
        _access_token = ""
        _bound_at = None
        _pending = {}


def public_base(request: Request | None = None) -> str:
    configured = (get_settings().oauth_public_base or "").strip().rstrip("/")
    if configured:
        return configured
    if request is None:
        return "https://plimsoll-oregon.onrender.com"
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    return f"{proto}://{host}".rstrip("/")


def client_id_url(request: Request | None = None) -> str:
    return f"{public_base(request)}/.well-known/oauth-client"


def redirect_uri(request: Request | None = None) -> str:
    return f"{public_base(request)}/v1/oauth/callback"


def client_metadata(request: Request) -> dict[str, Any]:
    cid = client_id_url(request)
    return {
        "client_id": cid,
        "client_name": "PLIMSOLL",
        "client_uri": (get_settings().oauth_frontend_origin or "https://plimsoll-jade.vercel.app").rstrip("/"),
        "redirect_uris": [redirect_uri(request)],
        "grant_types": ["authorization_code"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none",
        "application_type": "web",
    }


def _s256(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def _allowed_origin(origin: str) -> bool:
    origin = origin.rstrip("/")
    allowed = {
        (get_settings().oauth_frontend_origin or "").strip().rstrip("/"),
        "https://plimsoll-jade.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    allowed.discard("")
    if origin in allowed:
        return True
    parsed = urlparse(origin)
    if parsed.scheme == "https" and parsed.netloc.endswith(".vercel.app"):
        return True
    extra = (get_settings().cors_origin or "").split(",")
    return origin in {o.strip().rstrip("/") for o in extra if o.strip() and o.strip() != "*"}


def _prune_pending() -> None:
    now = time.time()
    dead = [k for k, v in _pending.items() if now - v.created > PENDING_TTL_S]
    for k in dead:
        _pending.pop(k, None)


def _frontend_redirect(origin: str, status: str, reason: str = "") -> RedirectResponse:
    origin = origin.rstrip("/")
    qs = urlencode({k: v for k, v in (("oauth", status), ("reason", reason)) if v})
    url = f"{origin}/?{qs}#/settings"
    return RedirectResponse(url, status_code=302)


def _as_metadata(client: httpx.Client | None = None) -> dict[str, Any]:
    own = client is None
    http = client or httpx.Client(timeout=get_settings().http_timeout_s)
    try:
        resp = http.get(AS_METADATA_URL)
        resp.raise_for_status()
        body = resp.json()
        if not isinstance(body, dict):
            raise ValueError("oauth metadata not an object")
        return body
    finally:
        if own:
            http.close()


def start_authorize(request: Request, return_origin: str) -> RedirectResponse | JSONResponse:
    origin = (return_origin or get_settings().oauth_frontend_origin or "").strip()
    if not origin:
        origin = "https://plimsoll-jade.vercel.app"
    if not _allowed_origin(origin):
        return JSONResponse(
            {
                "error": "RETURN_ORIGIN_REFUSED",
                "reason": "Return origin is not an allowed PLIMSOLL frontend.",
            },
            status_code=400,
        )
    verifier = secrets.token_urlsafe(48)
    state = secrets.token_urlsafe(24)
    challenge = _s256(verifier)
    with _lock:
        _prune_pending()
        _pending[state] = _Pending(verifier=verifier, origin=origin.rstrip("/"), created=time.time())
    try:
        meta = _as_metadata()
    except Exception as exc:
        log.info("oauth_metadata_failed", extra={"error_class": type(exc).__name__, "phase": "ASK"})
        return JSONResponse(
            {
                "error": "OAUTH_METADATA_UNREACHABLE",
                "reason": "Binance authorization server metadata could not be reached.",
            },
            status_code=503,
        )
    authorize = str(meta.get("authorization_endpoint") or "")
    if not authorize:
        return JSONResponse(
            {"error": "OAUTH_METADATA_INVALID", "reason": "Authorization endpoint missing from live metadata."},
            status_code=503,
        )
    params = {
        "response_type": "code",
        "client_id": client_id_url(request),
        "redirect_uri": redirect_uri(request),
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
        "scope": OAUTH_SCOPE,
        "resource": MCP_RESOURCE,
    }
    log.info("oauth_start", extra={"phase": "ASK", "state": "NORMAL"})
    return RedirectResponse(f"{authorize}?{urlencode(params)}", status_code=302)


def handle_callback(request: Request) -> RedirectResponse:
    q = request.query_params
    origin_fallback = (get_settings().oauth_frontend_origin or "https://plimsoll-jade.vercel.app").rstrip("/")
    state = q.get("state") or ""
    with _lock:
        pending = _pending.pop(state, None) if state else None
    origin = pending.origin if pending else origin_fallback
    if q.get("error"):
        desc = (q.get("error_description") or q.get("error") or "").strip()
        reason = "Binance authorization was not completed."
        if desc:
            reason = f"Binance authorization was not completed ({desc[:180]})."
        return _frontend_redirect(origin, "denied", reason)
    code = q.get("code") or ""
    if not pending or not code:
        return _frontend_redirect(origin, "denied", "Binance authorization was not completed.")
    try:
        meta = _as_metadata()
        token_url = str(meta.get("token_endpoint") or "")
        if not token_url:
            return _frontend_redirect(origin, "error", "Token endpoint missing from live metadata.")
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri(request),
            "client_id": client_id_url(request),
            "code_verifier": pending.verifier,
            "resource": MCP_RESOURCE,
        }
        with httpx.Client(timeout=get_settings().http_timeout_s) as client:
            resp = client.post(token_url, data=payload, headers={"Accept": "application/json"})
        body: Any
        try:
            body = resp.json()
        except Exception:
            body = {}
        if resp.status_code >= 400 or not isinstance(body, dict) or not body.get("access_token"):
            log.info(
                "oauth_token_failed",
                extra={"error_class": f"HTTP_{resp.status_code}", "phase": "ASK"},
            )
            return _frontend_redirect(origin, "error", "Binance authorization was not completed.")
        set_runtime_token(str(body.get("access_token")))
        log.info("oauth_bound", extra={"phase": "ASK", "state": "NORMAL"})
        return _frontend_redirect(origin, "ok")
    except httpx.HTTPError as exc:
        log.info("oauth_token_http", extra={"error_class": type(exc).__name__, "phase": "ASK"})
        return _frontend_redirect(origin, "error", "Agentic account could not be reached.")
