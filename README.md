# PLIMSOLL

**Continuous exposure capacity for agentic trading.**

PLIMSOLL estimates how much exposure the market can support under your stated exit constraints — and keeps re-solving as conditions change. It does not claim a “maximum safe size,” a guaranteed exit, or invented mathematics. Capacity is an estimate on a captured market snapshot, then legalized with official Spot filters, then executed only after an explicit approval.

## Problem

Altcoin notional that looks fine at the mid can be un-exitable under a cost budget, a time budget, or both. Traders find that out when they try to leave.

## Solution

Invert the question: given a live book, 24h quote volume, fees, and the user’s constitution, how much quote notional can they hold such that an exit still fits those constraints?

- **Cost capacity:** walk the visible bid book; all-in taker cost (impact vs mid + fee) ≤ `max_exit_cost_bps`.
- **Time capacity:** `max_participation` × 24h `quoteVolume` × `max_exit_horizon_days`.
- Then apply `max_fraction_of_visible_book` and official `LOT_SIZE` / `MARKET_LOT_SIZE` / `NOTIONAL` filters.

Participation defaults to **10% of ADV** and is always shown. It is a user-controlled assumption, not a hidden constant.

## Asset support

Works with currently tradable Spot symbols supported by the live Binance exchange metadata and their current trading filters. Lot size, step size, min notional, and tradability are read from live `exchangeInfo` at snapshot time. ARKUSDT is a validation pair used in tests and demos — not a hardcoded product universe. PLIMSOLL does not claim to support every Binance coin.

## Agent loop

`OBSERVE → UNDERSTAND → PLAN → DECIDE → ASK → ACT → VERIFY → ADAPT`

Financial math is **deterministic Python**. The language layer may parse intent; it must not compute capacity.

Spine: **invert → legalize → approval → act → verify → re-invert**.

## Architecture

- Backend: Python FastAPI (`backend/`)
- Database: Supabase PostgreSQL (migrations via Alembic on `DIRECT_URL`; pooler URL at runtime with `pgbouncer` query stripped and prepared statements disabled)
- Market data: official public Spot REST (`/api/v3/depth`, `/api/v3/ticker/24hr`, `/api/v3/exchangeInfo`). If `api.binance.com` returns 418/4xx from a cloud IP, the backend retries the official market-data host `https://data-api.binance.vision` (market data only; not trading).
- Account / orders: official Agent OS MCP (`https://agent.binance.com/mcp/agentic`) after runtime tool discovery
- PLIMSOLL MCP (Oregon `POST /mcp`): health, oauth status, account view, capacity, intent. **No execute tool.** A supported Agent client can add both endpoints. Public capacity still uses official Spot REST.
- Frontend: Next.js (App Router, hash routes). Browser talks **only** to this backend. No Binance secrets in the client. Visual system is the `front` design, connected to Oregon — not a redesign.

Every payload is labelled `LIVE`, `REPLAY`, `PAPER`, `TESTNET`, or `SIMULATED`. Replay fixtures are tests, not product data.

## Binance Agent OS

Writes default to **off** (`WRITES_ENABLED=false`). `POST /v1/execute` is not authorization.

Official Binance Agent OS OAuth (CIMD + PKCE) is implemented on Oregon. **TRY WEB AUTHORIZE** reaches `accounts.binance.com` Agentic Account Access. Chrome-verified on 2026-09-08: Binance refuses this CIMD web client as an unsupported AI agent (`3346001`). Supported launch clients are Claude, Claude Code, Codex, ChatGPT, Cursor, and VS Code. Oregon stays unbound. We do not impersonate those clients.

Supported-agent path: add official MCP `https://agent.binance.com/mcp/agentic` in a supported client and complete Binance OAuth there. Public mode on the site still computes LIVE estimated exit capacity from official Spot REST. Private balances and execution require a real Agent OS bind.

A live Spot order from the desk still requires:

1. Application `writes_enabled=true`
2. Fresh snapshot hash matching the approval
3. Unexpired approval token
4. Operator types **`CONFIRM`**
5. Runtime MCP bind of `new order` + `get order`

Kill switch: `KILL_SWITCH=true` → writes `HALTED`.

This repository never ships API keys, OAuth tokens, or MCP access tokens.

## Setup

```powershell
cd backend
python -m pip install -r requirements.txt
copy ..\.env.example ..\.env
# fill secrets locally; do not commit .env
python -m pytest -q
python -m uvicorn app.main:app --host 0.0.0.0 --port 10000
```

Frontend (talks only to the backend):

```powershell
cd frontend
npm install
npm test
npm run dev
```

`NEXT_PUBLIC_API_BASE` defaults to the Oregon Render URL. For local API: `NEXT_PUBLIC_API_BASE=http://127.0.0.1:10000`.

Health: `GET /health`

## Environment variable names

| Name | Purpose |
|---|---|
| `APP_NAME` | Process name |
| `NODE_ENV` | `development` / `production` |
| `PORT` | Bind port (Render default 10000) |
| `CORS_ORIGIN` | Allowed origins |
| `DATABASE_URL` | Postgres pooler URL (runtime) |
| `DIRECT_URL` | Postgres direct URL (migrations) |
| `BINANCE_REST_BASE` | Public REST origin |
| `BINANCE_REST_FALLBACK` | Official market-data-only origin (`data-api.binance.vision`) |
| `BINANCE_MCP_URL` | Official MCP endpoint |
| `BINANCE_WS_BASE` | Public stream origin (reserved) |
| `WRITES_ENABLED` | Must stay `false` until an operator enables writes |
| `KILL_SWITCH` | Halt writes |
| `BINANCE_MCP_ACCESS_TOKEN` | Optional MCP bearer fallback (never commit) |
| `OAUTH_PUBLIC_BASE` | Public Oregon origin for CIMD client_id |
| `OAUTH_FRONTEND_ORIGIN` | Allowed frontend origin after OAuth |
| `PYTHON_VERSION` | Render native Python (e.g. 3.12.8) |

## Tests

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm test
```

Includes REPLAY books, property checks, HTTP 429/418 classes, MCP timeout / missing tool / schema-change fail-closed, kill-switch halt, approval expiry, duplicate `clientOrderId` suppression, isolated-schema Alembic, one **LIVE** public REST snapshot for `ARKUSDT` (no hardcoded prices), live `GET /v1/symbols` when the host is reachable, and symbol-agnostic filter/sizing fixtures.

## Deployment

Render **free** web service in **Oregon** (`https://plimsoll-oregon.onrender.com`). Frankfurt Render IPs received HTTP 418 from Binance public REST; Oregon reaches official `data-api.binance.vision`. Free instances sleep after ~15 minutes idle (750 hours/month). Do not attach a paid plan unless you explicitly choose to spend.

- Build: `pip install -r backend/requirements.txt`
- Start: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health: `GET /health`
- Pre-deploy: `cd backend && alembic upgrade head`

Blueprint: `render.yaml` (secrets `sync: false`).

Frontend (Vercel): https://plimsoll-jade.vercel.app

- `/` landing
- `#/app` operating desk (intent, capacity, charts, approval, typed CONFIRM)
- `#/portfolio` Agentic account positions (PUBLIC MODE until a supported Agent binds)
- `#/docs` product documentation
- `#/docs/mcp` official Agent OS MCP

The browser talks only to the Oregon API. Classification is whatever the backend returns (`LIVE` only when the snapshot is live). Charts use session LIVE solves and stored LIVE snapshot hashes. Empty history is shown as empty. Disconnected portfolio does not invent balances.

CI: GitHub Actions runs backend `pytest` and frontend `npm test` + `npm run build` on `main`.

## Safety

- No withdrawals
- No transfers unless a later, explicit product decision requires them
- No silent sells on over-capacity — propose trim
- Partial fills are not success; remaining size needs a new approval
- Stale snapshots refuse action
- Logs are JSON; secrets are not logged

## Limitations

- Capacity uses **visible** book and 24h volume. Icebergs and spoofing are not modelled.
- MCP `getAccount` does not label Agentic vs master. The operator must use the Agentic virtual sub-account created at MCP OAuth, not a Normal Sub.
- Agent OS web authorization currently requires a Binance-supported Agent client. This CIMD web client is refused (`3346001`). Oregon stays unbound. We do not impersonate listed agents.
- Live financial writes are blocked until `CONFIRM`.
- Free Render instances sleep; the first request after idle can take about a minute.
- Some cloud egress IPs are banned by Binance (`HTTP 418`). Production market data uses official REST hosts from an Oregon instance.
- Frontend: landing, desk, portfolio, agents, docs, MCP. The browser never holds Binance secrets.

## Demo

Live UI: https://plimsoll-jade.vercel.app (`/`, `#/app`, `#/docs`, `#/docs/mcp`) against Oregon `https://plimsoll-oregon.onrender.com`.

1. Open the landing. No warning gate. The ARKUSDT strip is a **LIVE** Oregon ticker feed, not a mock.
2. On `#/app`, choose a currently tradable Spot USDT pair (ARK remains a validation shortcut) and ask for a dollar size (try `$1000` then `$10000` with a one-day exit). Read estimated exit capacity, cost vs time, binding, utilization, and decision. Numbers come from `POST /v1/intent`.
3. If the agent proposes a legal size, issue a snapshot-bound approval. That token is **not** a financial write.
4. Settings shows **PUBLIC MODE** until a supported Agent OS client binds the Agentic account. **TRY WEB AUTHORIZE** reaches official Binance OAuth and currently returns unsupported-agent `3346001`.
5. A live order happens only after the operator types **`CONFIRM`** plus `WRITES_ENABLED=true`. Oregon `POST /v1/execution/prepare` checks live minNotional against the Agentic USDT balance first.
6. `POST /v1/resolve` re-inverts a held position. Over-capacity → `TRIM_HELD`, never an automatic sell.

The desk does not invent fills. Empty execution history means none stored.
