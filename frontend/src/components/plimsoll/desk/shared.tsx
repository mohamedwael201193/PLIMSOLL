"use client";

/**
 * PLIMSOLL desk — shared instrument pieces.
 * Everything here consumes API results; no capacity business logic lives in the UI.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import {
  fmtUsd,
  type Binding,
  type CapacityConstraints,
  type CapacityResult,
  type Classification,
} from "@/lib/capacity";
import { useToast } from "@/hooks/use-toast";
import type { CapacityHistory } from "./useCapacity";

/* ───────────────────────────────────────────────
   constants / helpers
   ─────────────────────────────────────────────── */

export const BEZIER: [number, number, number, number] = [0.19, 1, 0.22, 1];
export const SEGMENTS = 24;

export const focusGold =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plimsoll";

type CapacityStatus = "WITHIN_CAPACITY" | "OVER_CAPACITY";

/** Full USD formatting for readouts. */
export function fmtUsdFull(n: number): string {
  if (!isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** HH:MM:SS clock for snapshot timestamps and observation rows. */
export function fmtClock(input: number | string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function formatStepperValue(v: number, unit: string): string {
  if (unit === "USD") return `$${Math.round(v).toLocaleString("en-US")}`;
  if (unit === "DAYS") return `${v.toFixed(2)} ${unit}`;
  return `${v} ${unit}`;
}

/* ───────────────────────────────────────────────
   frame chrome
   ─────────────────────────────────────────────── */

/** Four corner brackets for `.corner-frame-4` parents. */
export function Corners({ tone = "gold" }: { tone?: "gold" | "dim" }) {
  const border = tone === "dim" ? "border-white/30" : "border-plimsoll";
  return (
    <>
      <span aria-hidden className={`cf cf-tl ${border}`} />
      <span aria-hidden className={`cf cf-tr ${border}`} />
      <span aria-hidden className={`cf cf-bl ${border}`} />
      <span aria-hidden className={`cf cf-br ${border}`} />
    </>
  );
}

/** Section label: `[ NN — NAME ]`. */
export function SectionLabel({
  index,
  name,
  className = "",
}: {
  index: string;
  name: string;
  className?: string;
}) {
  return (
    <span className={`font-code text-[10px] tracking-[0.3em] text-plimsoll/60 ${className}`}>
      [ {index} — {name} ]
    </span>
  );
}

/* ───────────────────────────────────────────────
   chips
   ─────────────────────────────────────────────── */

/** Displays the classification exactly as the API returns it. */
export function ClassificationChip({ classification }: { classification: Classification }) {
  const live = classification === "LIVE";
  return (
    <span
      className={`font-code text-[8px] sm:text-[9px] tracking-[0.2em] px-2 py-0.5 border ${
        live ? "border-plimsoll text-plimsoll bg-plimsoll/10" : "border-plimsoll/30 text-plimsoll/60"
      }`}
    >
      {classification}
    </span>
  );
}

/** OVER CAPACITY → rose accent / WITHIN → gold. */
export function StatusChip({ status }: { status: CapacityStatus }) {
  const over = status === "OVER_CAPACITY";
  return (
    <span
      className={`font-code text-[9px] tracking-[0.15em] px-2 py-1 border ${
        over ? "border-rose-400/60 text-rose-300 bg-rose-400/10" : "border-plimsoll/50 text-plimsoll bg-plimsoll/10"
      }`}
    >
      {over ? "OVER CAPACITY" : "WITHIN"}
    </span>
  );
}

/** Binding constraint badge — API value verbatim. */
export function BindingBadge({ binding }: { binding: Binding }) {
  return (
    <span className="font-code text-[9px] tracking-[0.15em] px-2 py-1 bg-plimsoll text-plimsoll-black">
      BINDING: {binding}
    </span>
  );
}

/* ───────────────────────────────────────────────
   constraint stepper
   ─────────────────────────────────────────────── */

export interface ConstraintStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

export function ConstraintStepper({ label, value, min, max, step, unit, onChange }: ConstraintStepperProps) {
  const labelId = `stepper-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const canDown = value - step >= min - 1e-9;
  const canUp = value + step <= max + 1e-9;
  const on = Math.round(((value - min) / (max - min)) * SEGMENTS);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div role="group" aria-labelledby={labelId}>
      <div className="flex items-baseline justify-between mb-2">
        <span id={labelId} className="font-code text-[10px] tracking-[0.2em] text-plimsoll/60">
          {label}
        </span>
        <span className="font-code text-[11px] text-plimsoll tabular-nums">{formatStepperValue(value, unit)}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={!canDown}
          aria-label={`Decrease ${label}`}
          className={`w-11 h-11 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center border transition-colors ${
            canDown
              ? "border-plimsoll/40 text-plimsoll hover:bg-plimsoll/10 hover:border-plimsoll"
              : "border-white/10 text-white/25 cursor-not-allowed"
          } ${focusGold}`}
        >
          <Minus className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
        </button>
        <div className="seg-bar flex-1 h-2 min-w-0" aria-hidden>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className={i < on ? "on" : ""} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={!canUp}
          aria-label={`Increase ${label}`}
          className={`w-11 h-11 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center border transition-colors ${
            canUp
              ? "border-plimsoll/40 text-plimsoll hover:bg-plimsoll/10 hover:border-plimsoll"
              : "border-white/10 text-white/25 cursor-not-allowed"
          } ${focusGold}`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   constraints console (reused by Desk + PositionDetail)
   ─────────────────────────────────────────────── */

const PANEL_STEPPERS: {
  key: Exclude<keyof CapacityConstraints, "symbol">;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  { key: "targetNotional", label: "TARGET_NOTIONAL", min: 500, max: 100_000, step: 500, unit: "USD" },
  { key: "maxExitCostBps", label: "MAX_EXIT_COST", min: 10, max: 200, step: 5, unit: "BPS" },
  { key: "exitHorizonDays", label: "EXIT_HORIZON", min: 0.25, max: 7, step: 0.25, unit: "DAYS" },
  { key: "participationPct", label: "PARTICIPATION", min: 1, max: 30, step: 1, unit: "% ADV" },
  { key: "bookFractionPct", label: "BOOK_FRACTION", min: 1, max: 100, step: 1, unit: "% BOOK" },
];

export function ConstraintsPanel({
  constraints,
  onPatch,
  onCompute,
  loading,
  error,
  stale,
  footerNote = "POST /v1/intent · OREGON · CONSTRAINTS ARE DECLARED, NEVER GUESSED",
}: {
  constraints: CapacityConstraints;
  onPatch: (p: Partial<CapacityConstraints>) => void;
  onCompute: () => void;
  loading: boolean;
  error: string | null;
  stale: boolean;
  footerNote?: string;
}) {
  return (
    <section aria-label="Constraints" className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-black/95 p-4 sm:p-6">
      <Corners />
      <div className="flex items-center justify-between font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">CONSTRAINTS</span>
        <span className="text-white/30">CONSTITUTION</span>
      </div>

      <div className="mt-5 space-y-5">
        {PANEL_STEPPERS.map((s) => (
          <ConstraintStepper
            key={s.key}
            label={s.label}
            value={constraints[s.key]}
            min={s.min}
            max={s.max}
            step={s.step}
            unit={s.unit}
            onChange={(v) => onPatch({ [s.key]: v } as Partial<CapacityConstraints>)}
          />
        ))}
      </div>

      <div className="mt-6">
        {stale && !loading && (
          <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/70 mb-2" role="status">
            CONSTRAINTS CHANGED — RE-SOLVE
          </div>
        )}
        <button
          type="button"
          onClick={onCompute}
          disabled={loading}
          className={`tech-box-dark w-full font-code text-xs sm:text-sm tracking-[0.2em] ${
            loading ? "opacity-60 pointer-events-none" : ""
          } ${focusGold}`}
          aria-label="Re-solve capacity"
          aria-busy={loading || undefined}
        >
          {loading ? (
            <span className="blink">RE-SOLVING…</span>
          ) : (
            <>
              <span aria-hidden>&gt;_</span>RE-SOLVE_CAPACITY
            </>
          )}
        </button>
        {error && (
          <p role="alert" className="mt-3 font-code text-[10px] tracking-[0.15em] text-rose-400">
            ERR: {error} — ADJUST AND RE-SOLVE
          </p>
        )}
        <div className="mt-3 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/30">{footerNote}</div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   animated number
   ─────────────────────────────────────────────── */

export function AnimatedUsd({
  value,
  format,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.8,
      ease: BEZIER,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value]);

  return <span className={`tabular-nums ${className}`}>{format(display)}</span>;
}

/* ───────────────────────────────────────────────
   utilization bar with THE LINE marker
   ─────────────────────────────────────────────── */

export function UtilizationBar({
  utilization,
  status,
}: {
  utilization: number;
  status: CapacityStatus;
}) {
  const over = status === "OVER_CAPACITY" || utilization > 100;
  const scaleMax = Math.max(utilization, 100) * 1.06;
  const fillPct = Math.min(100, (utilization / scaleMax) * 100);
  const linePct = Math.min(100, (100 / scaleMax) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/45">
        <span>
          UTILIZATION <span className={over ? "text-rose-300" : "text-plimsoll"}>{utilization.toFixed(1)}%</span>
        </span>
        <span className="text-plimsoll/60">100% — THE LINE</span>
      </div>
      <div
        className="relative h-3 bg-plimsoll-black border border-plimsoll/25"
        role="img"
        aria-label={`Utilization ${utilization.toFixed(1)} percent against the 100 percent load line`}
      >
        <motion.div
          initial={false}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.7, ease: BEZIER }}
          className={`absolute inset-y-0 left-0 ${over ? "bg-rose-400" : "bg-plimsoll"}`}
        />
        <span
          aria-hidden
          className="absolute -top-[3px] -bottom-[3px] w-[3px] bg-plimsoll-black border-x border-white/50 z-10"
          style={{ left: `calc(${linePct}% - 1.5px)` }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   cost / time / book bars with BINDS tag
   ─────────────────────────────────────────────── */

export function CapacityBars({ result }: { result: CapacityResult }) {
  const rows = [
    { label: "COST", value: result.costCapacity, binds: result.binding === "COST" },
    { label: "TIME", value: result.timeCapacity, binds: result.binding === "TIME" },
    { label: "BOOK", value: result.bookCapacity, binds: result.binding === "BOOK" },
  ];
  return (
    <div>
      <div className="space-y-3">
        {rows.map((r) => {
          const frac = r.value > 0 ? Math.min(1, result.requestedNotional / r.value) : 1;
          const on = Math.max(1, Math.ceil(frac * SEGMENTS));
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span
                className={`font-code text-[9px] sm:text-[10px] tracking-[0.2em] w-12 shrink-0 ${
                  r.binds ? "text-plimsoll font-bold" : "text-white/50"
                }`}
              >
                {r.label}
              </span>
              <div className="seg-bar flex-1 h-2 min-w-0" aria-hidden>
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <span key={i} className={i < on ? "on" : ""} />
                ))}
              </div>
              <span
                className={`font-code text-[9px] sm:text-[10px] tabular-nums w-16 text-right shrink-0 ${
                  r.binds ? "text-plimsoll" : "text-white/60"
                }`}
              >
                {fmtUsdFull(r.value)}
              </span>
              {r.binds ? (
                <span className="font-code text-[8px] tracking-[0.15em] bg-plimsoll text-plimsoll-black px-1.5 py-0.5 shrink-0">
                  BINDS
                </span>
              ) : (
                <span aria-hidden className="w-[42px] shrink-0 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 font-code text-[8px] tracking-[0.15em] text-plimsoll/40">
        {result.binding === "FILTERS"
          ? "FILTERS LEGALIZE THE FINAL SIZE — LOT_SIZE ROUNDING BINDS BELOW THE RAW CAPACITIES."
          : `REQUESTED ${fmtUsdFull(result.requestedNotional)} — THE BINDING CONSTRAINT DRAWS THE LINE.`}
      </div>
    </div>
  );
}

export function CapacityBarsCard({ result }: { result: CapacityResult | null }) {
  return (
    <section aria-label="Constraint headroom" className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-black/95 p-4 sm:p-6">
      <Corners />
      <div className="flex items-center justify-between font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">CONSTRAINT HEADROOM</span>
        <span className="text-white/30">C/T/B</span>
      </div>
      <div className="mt-4">
        {result ? (
          <CapacityBars result={result} />
        ) : (
          <div className="py-6 text-center font-code text-[10px] tracking-[0.25em] text-plimsoll/40">
            [ AWAITING SOLVE ]
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   hero capacity readout (reused by Desk + PositionDetail)
   ─────────────────────────────────────────────── */

export function CapacityReadout({
  result,
  loading,
  header,
  showClassification = true,
}: {
  result: CapacityResult | null;
  loading: boolean;
  header?: ReactNode;
  showClassification?: boolean;
}) {
  return (
    <section
      aria-label="Estimated exit capacity"
      aria-busy={loading || undefined}
      className="corner-frame-4 text-plimsoll border border-plimsoll/30 bg-plimsoll-ink p-4 sm:p-6 relative"
    >
      <Corners />
      {header}
      {result ? (
        <ReadoutBody result={result} showClassification={showClassification} />
      ) : (
        <div className="py-16 text-center font-code text-xs tracking-[0.25em] text-plimsoll/60">
          [ AWAITING_CONSTRAINTS<span className="caret" aria-hidden /> ]
        </div>
      )}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-20 bg-plimsoll-black/90 flex flex-col items-center justify-center gap-2"
        >
          <span className="font-code text-xs sm:text-sm tracking-[0.3em] text-plimsoll blink">RE-SOLVING</span>
          <span className="font-code text-[9px] tracking-[0.2em] text-white/50">
            WALKING VISIBLE BID BOOK — SNAPSHOT MUST BE FRESH
          </span>
        </motion.div>
      )}
    </section>
  );
}

function ReadoutBody({ result, showClassification }: { result: CapacityResult; showClassification: boolean }) {
  const over = result.status === "OVER_CAPACITY";
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/80">
          ESTIMATED EXIT CAPACITY
        </span>
        {showClassification && <ClassificationChip classification={result.classification} />}
      </div>

      <div className="mt-3 flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-4xl sm:text-6xl leading-none text-plimsoll">
          <AnimatedUsd value={result.exitCapacity} format={fmtUsd} />
        </span>
        <span className="font-code text-[10px] sm:text-xs tracking-[0.2em] text-white/60">{result.symbol}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-code text-[9px] sm:text-[10px] tracking-[0.15em] text-white/45">
        <span>
          REQUESTED <span className="text-white/85">{fmtUsdFull(result.requestedNotional)}</span>
        </span>
        <span>
          MID <span className="text-white/85">{result.snapshot.mid.toFixed(4)}</span>
        </span>
      </div>

      <div className="mt-3">
        <UtilizationBar utilization={result.utilization} status={result.status} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <BindingBadge binding={result.binding} />
        <StatusChip status={result.status} />
        <span className="font-code text-[9px] tracking-[0.15em] px-2 py-1 border border-plimsoll/40 text-plimsoll">
          RECOMMENDATION: {result.recommendation.replace(/_/g, " ")}
        </span>
        {over && (
          <span className="font-code text-[9px] tracking-[0.15em] px-2 py-1 border border-rose-400/60 text-rose-300">
            PAST THE LINE
          </span>
        )}
      </div>

      <p className="mt-4 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-white/75">{result.narrative}</p>

      <div className="mt-4 pt-3 border-t border-plimsoll/15 font-code text-[8px] sm:text-[9px] tracking-[0.12em] text-plimsoll/50 flex flex-wrap gap-x-4 gap-y-1">
        <span>SNAPSHOT {result.snapshot.hash}</span>
        <span>SPREAD {result.snapshot.spreadBps.toFixed(1)} BPS</span>
        <span>VISIBLE BID {fmtUsd(result.snapshot.visibleBidNotional)}</span>
        <span>24H QV {fmtUsd(result.snapshot.quoteVolume24h)}</span>
        <span>TS {fmtClock(result.snapshot.ts)}</span>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   capacity over time — recharts instrument
   ─────────────────────────────────────────────── */

export function CapacityChartCard({
  history,
  compact = false,
  className = "",
}: {
  history: CapacityHistory | null;
  compact?: boolean;
  className?: string;
}) {
  const over = history?.state === "OVER_CAPACITY";
  return (
    <section
      aria-label="Capacity over time"
      className={`corner-frame-4 text-plimsoll border border-plimsoll/30 bg-plimsoll-ink p-4 sm:p-6 ${className}`}
    >
      <Corners />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-code text-[9px] sm:text-[10px] tracking-[0.2em]">
        <span className="text-plimsoll/90">CAPACITY OVER TIME</span>
        <span className="text-plimsoll/60">CLASSIFICATION: {history ? history.classification : "—"}</span>
      </div>
      <div className="mt-3">
        <CapacityChart history={history} compact={compact} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-4 font-code text-[8px] sm:text-[9px] tracking-[0.15em] text-white/40">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-3 h-0.5 bg-plimsoll" />
            CAPACITY
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-3 h-0.5 bg-rose-400" />
            POSITION LINE / OVER
          </span>
        </div>
        {history &&
          (over ? (
            <p className="font-code text-[9px] sm:text-[10px] tracking-[0.12em] text-rose-300">
              The market changed. <span className="text-plimsoll">THE LINE MOVED.</span>
            </p>
          ) : (
            <span className="font-code text-[8px] sm:text-[9px] tracking-[0.15em] text-plimsoll/40">{history.event}</span>
          ))}
      </div>
    </section>
  );
}

export function CapacityChart({ history, compact = false }: { history: CapacityHistory | null; compact?: boolean }) {
  const height = compact ? 180 : 260;

  if (!history || history.series.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center border border-plimsoll/15 bg-plimsoll-black/60 font-code text-[10px] tracking-[0.25em] text-plimsoll/50"
      >
        [ AWAITING SERIES<span className="caret" aria-hidden /> ]
      </div>
    );
  }

  const position = history.position;
  const data = history.series.map((p) => ({
    t: p.t,
    capacity: p.capacity,
    over: p.capacity < position ? p.capacity : null,
  }));
  const minPoint = history.series.reduce((a, b) => (b.capacity < a.capacity ? b : a));
  const domainMax = Math.ceil(Math.max(position, ...history.series.map((s) => s.capacity)) * 1.1);
  const tick = { fill: "rgba(238,241,246,0.45)", fontSize: 9, fontFamily: "monospace" } as const;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="plimsoll-capacity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCD535" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#FCD535" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(252,213,53,0.08)" />
          <XAxis dataKey="t" interval={0} tick={tick} axisLine={{ stroke: "rgba(252,213,53,0.25)" }} tickLine={false} />
          <YAxis
            width={compact ? 40 : 48}
            tick={tick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtUsd(v)}
            domain={[0, domainMax]}
          />
          <Tooltip content={<ChartTooltip position={position} />} cursor={{ stroke: "rgba(252,213,53,0.35)", strokeDasharray: "4 4" }} />
          <Area
            type="linear"
            dataKey="capacity"
            name="CAPACITY"
            stroke="#FCD535"
            strokeWidth={2}
            fill="url(#plimsoll-capacity-fill)"
            dot={false}
            activeDot={{ r: 3, fill: "#FCD535", stroke: "#0B0C15", strokeWidth: 1 }}
          />
          <Area
            type="linear"
            dataKey="over"
            name="OVER"
            stroke="#FB7185"
            strokeWidth={2}
            fill="rgba(251,113,133,0.25)"
            connectNulls={false}
            dot={{ r: 2.5, fill: "#FB7185", strokeWidth: 0 }}
            activeDot={{ r: 3, fill: "#FB7185", stroke: "#0B0C15", strokeWidth: 1 }}
          />
          <ReferenceLine
            y={position}
            stroke="#FB7185"
            strokeDasharray="4 4"
            label={{ value: "POSITION", position: "insideTopRight", fill: "#FB7185", fontSize: 9, fontFamily: "monospace" }}
          />
          <ReferenceDot
            x={minPoint.t}
            y={minPoint.capacity}
            r={4}
            fill="#FB7185"
            stroke="#0B0C15"
            strokeWidth={1}
            label={{ value: "MIN", position: "top", fill: "#FB7185", fontSize: 9, fontFamily: "monospace" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  position,
}: TooltipProps<number, string> & { position: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const capEntry = payload.find((p) => p.dataKey === "capacity");
  const capacity = typeof capEntry?.value === "number" ? capEntry.value : null;
  if (capacity === null) return null;
  const over = capacity < position;
  return (
    <div className="pointer-events-none bg-plimsoll-ink border border-plimsoll/40 font-code text-[9px] tracking-[0.12em] p-2 text-plimsoll">
      <div className="text-white/50">{label}</div>
      <div className="mt-1">CAPACITY {fmtUsd(capacity)}</div>
      <div className="mt-0.5 text-white/50">POSITION {fmtUsd(position)}</div>
      {over && <div className="mt-0.5 text-rose-300">OVER CAPACITY — BELOW THE POSITION</div>}
    </div>
  );
}

/* ───────────────────────────────────────────────
   replay action toast (shared disclaimer)
   ─────────────────────────────────────────────── */

export function useReplayAction() {
  const { toast } = useToast();
  return useCallback(
    (title: string) => {
      const t = toast({
        title,
        description: "REPLAY — approvals are not financial writes. WRITES_ENABLED=false.",
      });
      window.setTimeout(() => t.dismiss(), 6000);
    },
    [toast]
  );
}
