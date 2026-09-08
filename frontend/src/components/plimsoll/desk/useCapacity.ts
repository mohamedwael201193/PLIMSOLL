"use client";

/**
 * PLIMSOLL desk — capacity data hooks.
 * The UI never computes capacity; it only consumes /api/capacity results.
 * The declared constraint set ("constitution") persists to localStorage as UI state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ASSETS, DEFAULT_CONSTRAINTS, type CapacityConstraints, type CapacityResult, type Classification } from "@/lib/capacity";
import { getSnapshots, intentText, postIntent } from "@/lib/oregon";

const STORAGE_KEY = "plimsoll-constitution";
const MIN_SOLVE_MS = 1500;

/* ───────────────────────────────────────────────
   history API shapes
   ─────────────────────────────────────────────── */

export interface CapacityHistoryPoint {
  t: string;
  capacity: number;
  position: number;
}

export interface ObservationRow {
  symbol: string;
  hash: string;
  binding: string;
  classification: string;
  createdAt: string;
}

export interface CapacityHistory {
  classification: Classification;
  symbol: string;
  series: CapacityHistoryPoint[];
  position: number;
  minCapacity: number;
  state: "OVER_CAPACITY" | "WITHIN_CAPACITY";
  event: string;
  observations: ObservationRow[];
}

const sessionSeries: Record<string, CapacityHistoryPoint[]> = {};
const sessionObs: Record<string, ObservationRow[]> = {};

export function rememberSolve(result: CapacityResult) {
  const symbol = result.symbol;
  const t = new Date(result.snapshot.ts).toISOString().slice(11, 16);
  const point: CapacityHistoryPoint = {
    t,
    capacity: result.exitCapacity,
    position: 0,
  };
  sessionSeries[symbol] = [...(sessionSeries[symbol] || []), point].slice(-24);
  const row: ObservationRow = {
    symbol,
    hash: result.snapshot.hash,
    binding: result.binding,
    classification: result.classification,
    createdAt: new Date(result.snapshot.ts).toISOString(),
  };
  sessionObs[symbol] = [...(sessionObs[symbol] || []), row].slice(-24);
}

/* ───────────────────────────────────────────────
   constitution persistence (SSR-safe, clamped to stepper bounds)
   ─────────────────────────────────────────────── */

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function readStoredConstitution(): CapacityConstraints | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.symbol !== "string" || !ASSETS.some((a) => a.symbol === o.symbol)) return null;
    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const targetNotional = num(o.targetNotional);
    const maxExitCostBps = num(o.maxExitCostBps);
    const exitHorizonDays = num(o.exitHorizonDays);
    const participationPct = num(o.participationPct);
    const bookFractionPct = num(o.bookFractionPct);
    if (
      targetNotional === null ||
      maxExitCostBps === null ||
      exitHorizonDays === null ||
      participationPct === null ||
      bookFractionPct === null
    ) {
      return null;
    }
    return {
      symbol: o.symbol,
      targetNotional: clamp(targetNotional, 500, 100_000),
      maxExitCostBps: clamp(maxExitCostBps, 10, 200),
      exitHorizonDays: clamp(exitHorizonDays, 0.25, 7),
      participationPct: clamp(participationPct, 1, 30),
      bookFractionPct: clamp(bookFractionPct, 1, 100),
    };
  } catch {
    return null;
  }
}

/* ───────────────────────────────────────────────
   useCapacity — solve the current constraints
   ─────────────────────────────────────────────── */

export interface UseCapacityOptions {
  initial?: CapacityConstraints;
  /** Persist the constraint set to localStorage. The desk persists; per-position consoles do not. */
  persist?: boolean;
  position?: { symbol: string; base_qty: string };
}

export interface UseCapacityApi {
  constraints: CapacityConstraints;
  result: CapacityResult | null;
  raw: unknown | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  compute: (override?: CapacityConstraints) => Promise<void>;
  patch: (p: Partial<CapacityConstraints>) => void;
}

export function useCapacity(options?: UseCapacityOptions): UseCapacityApi {
  const [constraints, setConstraints] = useState<CapacityConstraints>(
    options?.initial ?? DEFAULT_CONSTRAINTS
  );
  const [result, setResult] = useState<CapacityResult | null>(null);
  const [raw, setRaw] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solvedFor, setSolvedFor] = useState<CapacityConstraints | null>(null);
  const constraintsRef = useRef(constraints);
  const busyRef = useRef(false);
  const positionRef = useRef(options?.position);
  positionRef.current = options?.position;

  useEffect(() => {
    constraintsRef.current = constraints;
  }, [constraints]);

  const compute = useCallback(async (override?: CapacityConstraints) => {
    const next = override ?? constraintsRef.current;
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const request = postIntent(intentText(next), next, positionRef.current).then((r) => r);
      // keep the solve perceptible — the operator should see the instrument work
      const floor = new Promise<void>((resolve) => window.setTimeout(resolve, MIN_SOLVE_MS));
      const [res] = await Promise.all([request, floor]);
      if (res.mapped.classification === "LIVE") rememberSolve(res.mapped);
      setResult(res.mapped);
      setRaw(res.raw);
      setSolvedFor(next);
    } catch (e) {
      const message = e instanceof Error ? e.message : "capacity resolution failed";
      setError(message.toUpperCase().replace(/\s+/g, "_"));
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, []);

  // auto-load on mount: hydrate the persisted constitution, then solve once
  const initialRef = useRef(options?.initial);
  const persistRef = useRef(options?.persist !== false);
  useEffect(() => {
    const stored = persistRef.current ? readStoredConstitution() : null;
    if (stored) setConstraints(stored);
    void compute(stored ?? initialRef.current ?? DEFAULT_CONSTRAINTS);
  }, [compute]);

  // persist the constitution on every change (storage may be unavailable — that is fine)
  useEffect(() => {
    if (!persistRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(constraints));
    } catch {
      /* the constitution stays in memory */
    }
  }, [constraints]);

  const patch = useCallback((p: Partial<CapacityConstraints>) => {
    setConstraints((c) => ({ ...c, ...p }));
  }, []);

  const stale = solvedFor !== null && JSON.stringify(solvedFor) !== JSON.stringify(constraints);

  return { constraints, result, raw, loading, error, stale, compute, patch };
}

/* ───────────────────────────────────────────────
   useCapacityHistory — capacity over time + observations
   ─────────────────────────────────────────────── */

export interface UseCapacityHistoryApi {
  history: CapacityHistory | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCapacityHistory(symbol: string): UseCapacityHistoryApi {
  const [history, setHistory] = useState<CapacityHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (): Promise<CapacityHistory | null> => {
    const series = sessionSeries[symbol] || [];
    const localObs = sessionObs[symbol] || [];
    let remote: ObservationRow[] = [];
    try {
      const body = await getSnapshots(symbol);
      remote = (body.observations || [])
        .filter((o) => o.classification === "LIVE")
        .map((o) => ({
          symbol,
          hash: (o.snapshot_hash || "").slice(0, 18),
          binding: "—",
          classification: o.classification,
          createdAt: o.captured_at || "",
        }));
    } catch {
      /* stored snapshots are optional */
    }
    const liveSeries = series.length > 0 && series.every(() => true);
    const cls: Classification = series.length > 0 ? "LIVE" : remote.length > 0 ? "LIVE" : "UNKNOWN";
    const moved = series.length >= 2 && series[series.length - 1].capacity !== series[0].capacity;
    return {
      classification: liveSeries ? cls : cls,
      symbol,
      series,
      position: 0,
      minCapacity: series.length ? Math.min(...series.map((s) => s.capacity)) : 0,
      state: "WITHIN_CAPACITY",
      event: moved ? "THE LINE MOVED" : series.length ? "SESSION OBSERVATIONS" : "NO SESSION OBSERVATIONS YET",
      observations: [...localObs, ...remote].slice(-12).reverse(),
    };
  }, [symbol]);

  // reload when the symbol changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const h = await loadHistory();
      if (cancelled) return;
      if (h) setHistory(h);
      else setError("HISTORY_UNAVAILABLE");
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  // silent refresh — called after each solve so new observations appear
  const refresh = useCallback(async () => {
    const h = await loadHistory();
    if (h) setHistory(h);
    else setError("HISTORY_UNAVAILABLE");
  }, [loadHistory]);

  return { history, loading, error, refresh };
}
