/**
 * PLIMSOLL capacity contracts — shared by the API layer and the UI.
 * The UI never computes capacity; it only consumes these shapes.
 */

export interface AssetInfo {
  symbol: string; // e.g. ARKUSDT
  base: string; // ARK
  name: string;
  icon: string; // /icons/ARK.png
}

export const ASSETS: AssetInfo[] = [
  { symbol: "ARKUSDT", base: "ARK", name: "Ark", icon: "/icons/ARK.png" },
  { symbol: "BTCUSDT", base: "BTC", name: "Bitcoin", icon: "/icons/BTC.png" },
  { symbol: "ETHUSDT", base: "ETH", name: "Ethereum", icon: "/icons/ETH.png" },
  { symbol: "SOLUSDT", base: "SOL", name: "Solana", icon: "/icons/SOL.png" },
  { symbol: "FETUSDT", base: "FET", name: "Fetch.ai", icon: "/icons/FET.png" },
  { symbol: "BNBUSDT", base: "BNB", name: "BNB", icon: "/icons/BNB.png" },
  { symbol: "DOGEUSDT", base: "DOGE", name: "Dogecoin", icon: "/icons/DOGE.png" },
];

export function getAsset(symbol: string): AssetInfo | undefined {
  return ASSETS.find((a) => a.symbol === symbol);
}

/** Shortcuts for the desk. Not the tradable universe. */
export function normalizeSpotSymbol(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t || t === "USDT") return null;
  const symbol = t.endsWith("USDT") ? t : `${t}USDT`;
  if (!/^[A-Z0-9]{2,20}USDT$/.test(symbol) || symbol.length < 6) return null;
  return symbol;
}

export function isSpotUsdtSymbol(symbol: string): boolean {
  return normalizeSpotSymbol(symbol) === symbol.trim().toUpperCase();
}

export function assetFromSymbol(symbol: string): AssetInfo | undefined {
  const s = normalizeSpotSymbol(symbol);
  if (!s) return undefined;
  const known = getAsset(s);
  if (known) return known;
  const base = s.slice(0, -4);
  return { symbol: s, base, name: base, icon: `/icons/${base}.png` };
}

export interface CapacityConstraints {
  symbol: string;
  targetNotional: number;
  maxExitCostBps: number;
  exitHorizonDays: number;
  participationPct: number;
  bookFractionPct: number;
}

export const DEFAULT_CONSTRAINTS: CapacityConstraints = {
  symbol: "ARKUSDT",
  targetNotional: 10000,
  maxExitCostBps: 50,
  exitHorizonDays: 1,
  participationPct: 10,
  bookFractionPct: 50,
};

export type Binding = "COST" | "TIME" | "BOOK" | "FILTERS" | "NONE";
export type Classification = "LIVE" | "REPLAY" | "PAPER" | "TESTNET" | "SIMULATED" | "UNKNOWN";
export type DecisionAction =
  | "FILL_AS_ASKED"
  | "SIZE_DOWN"
  | "STAGE"
  | "WAIT"
  | "REFUSE"
  | "TRIM_HELD"
  | "ASK"
  | "HOLD";

export interface CapacitySnapshot {
  mid: number;
  spreadBps: number;
  visibleBidNotional: number;
  quoteVolume24h: number;
  ts: number;
  hash: string;
}

export interface CapacityResult {
  classification: Classification;
  symbol: string;
  requestedNotional: number;
  costCapacity: number;
  timeCapacity: number;
  bookCapacity: number;
  legalCapacity: number;
  exitCapacity: number;
  binding: Binding;
  utilization: number; // requested / capacity * 100
  status: "WITHIN_CAPACITY" | "OVER_CAPACITY";
  recommendation: DecisionAction;
  narrative: string;
  snapshot: CapacitySnapshot;
  constraints: CapacityConstraints;
  decision?: unknown;
  decisionAction?: DecisionAction;
  source?: string;
  capturedAt?: string;
  snapshotHash?: string;
}

export interface ResolvePoint {
  t: string;
  capacity: number;
  position: number;
}

export function fmtUsd(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
