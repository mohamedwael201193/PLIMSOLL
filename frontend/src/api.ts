import { classificationLabel, type Classification } from "./labels";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "https://plimsoll-oregon.onrender.com";

export function apiBase(): string {
  return API_BASE;
}

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON from backend (${res.status})`);
  }
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  const body = await parse(res);
  if (!res.ok) throw new Error("health failed");
  return body as { ok: boolean; writes_enabled: boolean; kill_switch: boolean; app: string; time?: string };
}

export async function getReady() {
  const res = await fetch(`${API_BASE}/ready`);
  const body = await parse(res);
  if (!res.ok) throw new Error("ready failed");
  return body as { ok: boolean; database: string };
}

export async function postCapacity(symbol: string, constitution: Record<string, unknown>, position?: { symbol: string; base_qty: string }) {
  const res = await fetch(`${API_BASE}/v1/capacity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, constitution, position }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `capacity ${res.status}`);
  return { ...body, classification: classificationLabel(body.classification) as Classification };
}

export async function postIntent(text: string, symbol: string, constitution: Record<string, unknown>, position?: { symbol: string; base_qty: string }) {
  const res = await fetch(`${API_BASE}/v1/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, symbol, constitution, position }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `intent ${res.status}`);
  return { ...body, classification: classificationLabel(body.classification) as Classification };
}

export async function postResolve(symbol: string, constitution: Record<string, unknown>, position?: { symbol: string; base_qty: string }) {
  const res = await fetch(`${API_BASE}/v1/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, constitution, position }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `resolve ${res.status}`);
  return { ...body, classification: classificationLabel(body.classification) as Classification };
}

export async function postApproval(decision: unknown) {
  const res = await fetch(`${API_BASE}/v1/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, ttl_s: 30 }),
  });
  const body = await parse(res);
  if (!res.ok) throw new Error(`approval ${res.status}`);
  return body;
}

export async function getMarket(symbol: string) {
  const res = await fetch(`${API_BASE}/v1/market/${encodeURIComponent(symbol)}`);
  const body = await parse(res);
  if (!res.ok) throw new Error(body?.detail?.error_class || `market ${res.status}`);
  return { ...body, classification: classificationLabel(body.classification) as Classification };
}

export async function getSnapshots(symbol: string) {
  const res = await fetch(`${API_BASE}/v1/snapshots/${encodeURIComponent(symbol)}`);
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
  const res = await fetch(`${API_BASE}/v1/fills`);
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
    note?: string;
  };
}
