/**
 * Oregon FastAPI client. The UI never computes capacity.
 * Browser talks only to this backend. No Binance secrets here.
 */

import {
  type Binding,
  type CapacityConstraints,
  type CapacityResult,
  type Classification,
  type DecisionAction,
} from "./capacity";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "https://plimsoll-oregon.onrender.com"
).replace(/\/$/, "");

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from backend (${res.status})`);
  }
}

export function toConstitution(c: CapacityConstraints) {
  return {
    max_exit_cost_bps: String(c.maxExitCostBps),
    max_exit_horizon_days: String(c.exitHorizonDays),
    max_participation: String(c.participationPct / 100),
    max_fraction_of_visible_book: String(c.bookFractionPct / 100),
    never_increase_if_capacity_falling: true,
  };
}

function mapBinding(raw: string | undefined): Binding {
  if (raw === "COST") return "COST";
  if (raw === "TIME") return "TIME";
  if (raw === "BOOK_FRACTION" || raw === "BOOK") return "BOOK";
  if (raw === "FILTER" || raw === "FILTERS") return "FILTERS";
  return "NONE";
}

function mapClass(raw: string | undefined): Classification {
  if (raw === "LIVE" || raw === "REPLAY" || raw === "PAPER" || raw === "SIMULATED") return raw;
  return "UNKNOWN";
}

function mapAction(raw: string | undefined, requested: number, cap: number): DecisionAction {
  if (raw === "FILL_AS_ASKED") return "FILL_AS_ASKED";
  if (raw === "SIZE_DOWN") return "SIZE_DOWN";
  if (raw === "STAGE") return "STAGE";
  if (raw === "WAIT") return "WAIT";
  if (raw === "REFUSE") return "REFUSE";
  if (raw === "TRIM_HELD") return "TRIM_HELD";
  if (raw === "ASK") return "ASK";
  if (requested > cap) return "SIZE_DOWN";
  if (cap > 0 && requested <= cap) return "FILL_AS_ASKED";
  return "HOLD";
}

export function mapCapacityBody(body: any, constraints: CapacityConstraints): CapacityResult {
  const cap = body.capacity || body.decision?.capacity || {};
  const market = body.market || {};
  const requested = Number(
    body.decision?.requested_notional ?? constraints.targetNotional
  );
  const exitCapacity = Number(cap.estimated_exit_capacity_notional || 0);
  const cost = Number(cap.cost_capacity_notional || 0);
  const time = Number(cap.time_capacity_notional || 0);
  const visible = Number(cap.visible_exit_book_notional || 0);
  const frac = Number(cap.fraction_applied ?? constraints.bookFractionPct / 100);
  const bookCapacity = visible * frac;
  const action = String(body.decision?.action || "");
  const recommendation = mapAction(action, requested, exitCapacity);

  const last = Number(market.last_price || 0);
  const bid = Number(market.best_bid || 0);
  const ask = Number(market.best_ask || 0);
  const mid = bid && ask ? (bid + ask) / 2 : last;
  const spreadBps = bid && ask && ask > 0 ? ((ask - bid) / ask) * 10_000 : 0;
  const cls = mapClass(body.classification);

  return {
    classification: cls,
    symbol: String(market.symbol || constraints.symbol).toUpperCase(),
    requestedNotional: requested,
    costCapacity: cost,
    timeCapacity: time,
    bookCapacity,
    legalCapacity: exitCapacity,
    exitCapacity,
    binding: mapBinding(cap.binding),
    utilization: exitCapacity > 0 ? (requested / exitCapacity) * 100 : 0,
    status: requested > exitCapacity ? "OVER_CAPACITY" : "WITHIN_CAPACITY",
    recommendation,
    narrative:
      body.decision?.reason ||
      body.language ||
      "estimated exit capacity under stated constraints",
    snapshot: {
      mid,
      spreadBps,
      visibleBidNotional: visible,
      quoteVolume24h: Number(market.quote_volume_24h || 0),
      ts: Date.parse(body.captured_at || "") || Date.now(),
      hash: String(body.snapshot_hash || "").slice(0, 18) || "—",
    },
    constraints,
    decision: body.decision ?? null,
    decisionAction: recommendation,
    source: body.source,
    capturedAt: body.captured_at,
    snapshotHash: body.snapshot_hash,
  };
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  const body = await parse(res);
  if (!res.ok) throw new Error("health failed");
  return body as { ok: boolean; writes_enabled: boolean; kill_switch: boolean; app: string };
}

export async function getReady() {
  const res = await fetch(`${API_BASE}/ready`, { cache: "no-store" });
  const body = await parse(res);
  if (!res.ok) throw new Error("ready failed");
  return body as { ok: boolean; database: string };
}

export async function getAccount() {
  const res = await fetch(`${API_BASE}/v1/account`, { cache: "no-store" });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `account ${res.status}`);
  return body as {
    connected: boolean;
    classification: string;
    account_kind: string;
    reason?: string;
    agentic_note?: string;
    can_trade?: boolean;
    balances?: Array<{ asset: string; free: string; locked: string }>;
    writes_enabled: boolean;
    kill_switch: boolean;
    bound?: boolean;
    tool_count?: number;
    capabilities?: Record<string, string>;
  };
}

export async function getTickers(symbols: string[]) {
  const res = await fetch(
    `${API_BASE}/v1/tickers?symbols=${encodeURIComponent(symbols.join(","))}`,
    { cache: "no-store" }
  );
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `tickers ${res.status}`);
  return body as {
    classification: string;
    source: string;
    captured_at?: string;
    rows: Array<{ symbol: string; last: number; change: number; quoteVolume: number }>;
  };
}

export async function postCapacity(constraints: CapacityConstraints, position?: { symbol: string; base_qty: string }) {
  const res = await fetch(`${API_BASE}/v1/capacity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: constraints.symbol,
      constitution: toConstitution(constraints),
      position,
    }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `capacity ${res.status}`);
  return { raw: body, mapped: mapCapacityBody(body, constraints) };
}

export async function postIntent(
  text: string,
  constraints: CapacityConstraints,
  position?: { symbol: string; base_qty: string }
) {
  const res = await fetch(`${API_BASE}/v1/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      symbol: constraints.symbol,
      constitution: toConstitution(constraints),
      position,
    }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `intent ${res.status}`);
  return { raw: body, mapped: mapCapacityBody(body, constraints) };
}

export async function postResolve(
  constraints: CapacityConstraints,
  position?: { symbol: string; base_qty: string }
) {
  const res = await fetch(`${API_BASE}/v1/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: constraints.symbol,
      constitution: toConstitution(constraints),
      position,
    }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `resolve ${res.status}`);
  return { raw: body, mapped: mapCapacityBody(body, constraints) };
}

export async function postApproval(decision: unknown) {
  const res = await fetch(`${API_BASE}/v1/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, ttl_s: 30 }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(`approval ${res.status}`);
  return body as {
    approval_id: string;
    expires_at: string;
    snapshot_hash: string;
    confirmation_token: string;
    note?: string;
  };
}

export async function postExecute(payload: {
  confirm: string;
  confirmation_token: string;
  snapshot_hash: string;
  symbol: string;
  quote_order_qty?: string;
  quantity?: string;
}) {
  const res = await fetch(`${API_BASE}/v1/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, side: "BUY", intent_id: "desk" }),
  });
  const body = await parse(res);
  if (!res.ok) {
    const cls = body?.detail?.error_class || `execute ${res.status}`;
    throw new Error(typeof cls === "string" ? cls : JSON.stringify(cls));
  }
  return body;
}

export async function getSnapshots(symbol: string) {
  const res = await fetch(`${API_BASE}/v1/snapshots/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  const body = await parse(res);
  if (!res.ok) throw new Error(`snapshots ${res.status}`);
  return body as {
    symbol: string;
    observations: Array<{
      captured_at: string | null;
      classification: string;
      last_price?: string;
      quote_volume_24h?: string;
      snapshot_hash?: string;
    }>;
    note?: string;
  };
}

export async function getFills() {
  const res = await fetch(`${API_BASE}/v1/fills`, { cache: "no-store" });
  const body = await parse(res);
  if (!res.ok) throw new Error(`fills ${res.status}`);
  return body as {
    fills: Array<{
      client_order_id: string;
      order_id: string | null;
      status: string;
      executed_qty: string;
      cumm_quote: string;
    }>;
  };
}

export async function getMcpCapabilities() {
  const res = await fetch(`${API_BASE}/v1/mcp/capabilities`, { cache: "no-store" });
  const body = await parse(res);
  if (!res.ok) throw new Error(`mcp ${res.status}`);
  return body as {
    classification: string;
    bound: boolean;
    reason?: string;
    capabilities?: Record<string, string>;
    tool_count?: number;
    writes_enabled?: boolean;
    kill_switch?: boolean;
  };
}

export async function postPrepare(symbol: string, quoteBudget?: string) {
  const res = await fetch(`${API_BASE}/v1/execution/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, quote_budget: quoteBudget }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `prepare ${res.status}`);
  return body as {
    classification: string;
    symbol: string;
    connected: boolean;
    account_kind?: string;
    agentic_note?: string;
    can_trade?: boolean;
    usdt_free: string;
    last_price: string;
    filters: {
      min_notional: string;
      lot_min: string;
      lot_step: string;
      market_lot_min: string;
      market_lot_step: string;
      quote_asset: string;
      base_asset: string;
    };
    order: {
      symbol: string;
      side: string;
      type: string;
      quantity?: string | null;
      quote_order_qty?: string | null;
      notional: string;
    } | null;
    legal: boolean;
    unavailable_code?: string | null;
    unavailable?: string | null;
    writes_enabled: boolean;
    kill_switch: boolean;
    snapshot_hash: string;
    captured_at: string;
    note?: string;
  };
}

export function oauthStartUrl(origin: string) {
  const ret = encodeURIComponent(origin.replace(/\/$/, ""));
  return `${API_BASE}/v1/oauth/start?return=${ret}`;
}

export function intentText(c: CapacityConstraints): string {
  const base = c.symbol.replace(/USDT$/, "");
  const days = c.exitHorizonDays === 1 ? "one day" : `${c.exitHorizonDays} days`;
  return `I want $${c.targetNotional} of ${base} and need to exit within ${days}.`;
}
