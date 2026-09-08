from __future__ import annotations

from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.main import app
from app.rails.oauth import current_mcp_token, reset_oauth_state, set_runtime_token

client = TestClient(app)

META = {
    "authorization_endpoint": "https://accounts.binance.com/agentic-oauth/authorize",
    "token_endpoint": "https://accounts.binance.com/oauth-agentic/token",
}


def setup_function() -> None:
    reset_oauth_state()


def test_oauth_client_metadata():
    r = client.get("/.well-known/oauth-client")
    assert r.status_code == 200
    body = r.json()
    assert body["client_id"].endswith("/.well-known/oauth-client")
    assert body["token_endpoint_auth_method"] == "none"
    assert any(u.endswith("/v1/oauth/callback") for u in body["redirect_uris"])
    assert "access_token" not in body


def test_oauth_start_redirects_with_pkce():
    with patch("app.rails.oauth._as_metadata", return_value=META):
        r = client.get(
            "/v1/oauth/start",
            params={"return": "https://plimsoll-jade.vercel.app"},
            follow_redirects=False,
        )
    assert r.status_code == 302
    loc = r.headers["location"]
    assert loc.startswith("https://accounts.binance.com/agentic-oauth/authorize?")
    qs = parse_qs(urlparse(loc).query)
    assert qs["response_type"] == ["code"]
    assert qs["code_challenge_method"] == ["S256"]
    assert qs["code_challenge"][0]
    assert "code_verifier" not in loc
    assert qs["resource"] == ["https://agent.binance.com/mcp/agentic"]


def test_oauth_start_refuses_unknown_return():
    r = client.get("/v1/oauth/start", params={"return": "https://evil.example"}, follow_redirects=False)
    assert r.status_code == 400
    assert r.json()["error"] == "RETURN_ORIGIN_REFUSED"


def test_oauth_callback_denied():
    r = client.get(
        "/v1/oauth/callback",
        params={"error": "access_denied", "state": "none"},
        follow_redirects=False,
    )
    assert r.status_code == 302
    loc = r.headers["location"]
    assert "oauth=denied" in loc
    assert "access_token" not in loc


class _FakeToken:
    status_code = 200

    def json(self):
        return {"access_token": "unit-test-token"}


def test_oauth_callback_stores_token_server_side():
    with patch("app.rails.oauth._as_metadata", return_value=META):
        start = client.get(
            "/v1/oauth/start",
            params={"return": "https://plimsoll-jade.vercel.app"},
            follow_redirects=False,
        )
        state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
        with patch("app.rails.oauth.httpx.Client") as fake_client:
            fake_client.return_value.__enter__.return_value.post.return_value = _FakeToken()
            cb = client.get(
                "/v1/oauth/callback",
                params={"code": "abc", "state": state},
                follow_redirects=False,
            )
    assert cb.status_code == 302
    loc = cb.headers["location"]
    assert "oauth=ok" in loc
    assert "unit-test-token" not in loc
    assert current_mcp_token() == "unit-test-token"
    st = client.get("/v1/oauth/status").json()
    assert st["bound"] is True
    assert st["source"] == "OAUTH_RUNTIME"


def test_account_uses_runtime_token_source_without_exposing_it():
    set_runtime_token("")
    r = client.get("/v1/account")
    assert r.json()["connected"] is False
    health = client.get("/health").json()
    assert health["mcp_bound"] is False
    assert health["mcp_token_source"] == "NONE"
