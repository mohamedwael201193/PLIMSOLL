# PLIMSOLL

**Estimated exit capacity under the user’s stated constraints.**

PLIMSOLL is a Binance Agent OS product. It does not claim a “maximum safe size,” a guaranteed exit, guaranteed liquidity, or invented mathematics. Capacity is an estimate on a captured market snapshot, then legalized with official Spot filters, then executed only after an explicit approval.

## Problem

Altcoin notional that looks fine at the mid can be un-exitable under a cost budget, a time budget, or both. Traders find that out when they try to leave.

## Solution

Invert the question: given a live book, 24h quote volume, fees, and the user’s constitution, how much quote notional can they hold such that an exit still fits those constraints?

- **Cost capacity:** walk the visible bid book; all-in taker cost (impact vs mid + fee) ≤ `max_exit_cost_bps`.
- **Time capacity:** `max_participation` × 24h `quoteVolume` × `max_exit_horizon_days`.
- Then apply `max_fraction_of_visible_book` and official `LOT_SIZE` / `MARKET_LOT_SIZE` / `NOTIONAL` filters.

Participation defaults to **10% of ADV** and is always shown. It is a user-controlled assumption, not a hidden constant.

## Agent loop

`OBSERVE → UNDERSTAND → PLAN → DECIDE → ASK → ACT → VERIFY → ADAPT`

Financial math is **deterministic Python**. The language layer may parse intent; it must not compute capacity.

Spine: **invert → legalize → approval → act → verify → re-invert**.

## Architecture

- Backend: Python FastAPI (`backend/`)
- Database: Supabase PostgreSQL (migrations via Alembic on `DIRECT_URL`; pooler URL at runtime with `pgbouncer` query stripped and prepared statements disabled)
- Market data: official public Spot REST (`/api/v3/depth`, `/api/v3/ticker/24hr`, `/api/v3/exchangeInfo`). If `api.binance.com` returns 418/4xx from a cloud IP, the backend retries the official market-data host `https://data-api.binance.vision` (market data only; not trading).
- Account / orders: official Agent OS MCP (`https://agent.binance.com/mcp/agentic`) after runtime tool discovery
- Frontend: React + Vite. Browser talks **only** to this backend. No Binance secrets in the client.
- Browser talks only to this backend. No Binance secrets in the client.

Every payload is labelled `LIVE`, `REPLAY`, `PAPER`, `TESTNET`, or `SIMULATED`. Replay fixtures are tests, not product data.

## Binance Agent OS

Writes default to **off** (`WRITES_ENABLED=false`). `POST /v1/execute` is not authorization.

A live Spot order requires:

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

`VITE_API_BASE` defaults to the Oregon Render URL. For local API: `VITE_API_BASE=http://127.0.0.1:10000`.

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
| `BINANCE_MCP_ACCESS_TOKEN` | Optional MCP bearer for this backend client (never commit) |
| `PYTHON_VERSION` | Render native Python (e.g. 3.12.8) |

## Tests

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm test
```

Includes REPLAY books, property checks, HTTP 429/418 classes, approval expiry, duplicate `clientOrderId` suppression, isolated-schema Alembic, and one **LIVE** public REST snapshot for `ARKUSDT` (no hardcoded prices).

## Deployment

Render **free** web service in **Oregon** (`https://plimsoll-oregon.onrender.com`). Frankfurt Render IPs received HTTP 418 from Binance public REST; Oregon reaches official `data-api.binance.vision`. Free instances sleep after ~15 minutes idle (750 hours/month). Do not attach a paid plan unless you explicitly choose to spend.

- Build: `pip install -r backend/requirements.txt`
- Start: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health: `GET /health`
- Pre-deploy: `cd backend && alembic upgrade head`

Blueprint: `render.yaml` (secrets `sync: false`).

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
- Live financial writes are blocked until `CONFIRM`.
- Free Render instances sleep; the first request after idle can take about a minute.
- Some cloud egress IPs are banned by Binance (`HTTP 418`). Production market data uses official REST hosts from an Oregon instance.
- Frontend is a single intent → capacity → approval screen. It does not talk to Binance.

## Demo

1. `POST /v1/intent` with a dollar size and symbol (LIVE book).
2. Read `estimated_exit_capacity_notional`, `cost_capacity_notional`, `time_capacity_notional`, `binding`.
3. If the agent proposes a legal size, `POST /v1/approvals`.
4. A live order happens only after operator `CONFIRM` plus `WRITES_ENABLED=true`.
5. `POST /v1/resolve` re-inverts a held position. Over-capacity → `TRIM_HELD`, never an automatic sell.
