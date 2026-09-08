"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { ASSETS, DEFAULT_CONSTRAINTS, type CapacityConstraints, type CapacityResult } from "@/lib/capacity";
import { intentText, postIntent } from "@/lib/oregon";
import { Corners, SectionLabel, focusGold, reveal, BEZIER, fmtUsdFull } from "./shared";

interface Props {
  glitch: boolean;
}

type Phase = "idle" | "generating" | "result";

const SEGMENTS = 24;

interface StepperSpec {
  key: Exclude<keyof CapacityConstraints, "symbol">;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
}

const STEPPERS: StepperSpec[] = [
  {
    key: "targetNotional",
    label: "TARGET_NOTIONAL",
    min: 500,
    max: 100_000,
    step: 500,
    fmt: (v) => `$${v.toLocaleString("en-US")}`,
  },
  {
    key: "maxExitCostBps",
    label: "MAX_EXIT_COST",
    min: 10,
    max: 200,
    step: 5,
    fmt: (v) => `${v} BPS`,
  },
  {
    key: "exitHorizonDays",
    label: "EXIT_HORIZON",
    min: 0.25,
    max: 7,
    step: 0.25,
    fmt: (v) => `${v.toFixed(2)} DAYS`,
  },
  {
    key: "participationPct",
    label: "PARTICIPATION",
    min: 1,
    max: 30,
    step: 1,
    fmt: (v) => `${v} % ADV`,
  },
  {
    key: "bookFractionPct",
    label: "BOOK_FRACTION",
    min: 1,
    max: 100,
    step: 1,
    fmt: (v) => `${v} % BOOK`,
  },
];

export default function LiveCapacity({ glitch }: Props) {
  const [constraints, setConstraints] = useState<CapacityConstraints>(DEFAULT_CONSTRAINTS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CapacityResult | null>(null);
  const [solvedFor, setSolvedFor] = useState<CapacityConstraints | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hash, setHash] = useState("0x000000");
  const busyRef = useRef(false);

  const stale =
    solvedFor !== null && JSON.stringify(solvedFor) !== JSON.stringify(constraints);

  const compute = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase("generating");
    setError(null);
    setProgress(2);
    setHash("—");

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(93, p + 3 + Math.random() * 6));
    }, 90);

    const request = postIntent(intentText(constraints), constraints).then((r) => r.mapped);

    // hold the terminal on screen for at least 1.8s
    const floor = new Promise<void>((resolve) => setTimeout(resolve, 1800));

    try {
      const [outcome] = await Promise.allSettled([request, floor]);
      if (outcome.status === "fulfilled") {
        setProgress(100);
        setResult(outcome.value);
        setSolvedFor(constraints);
        setHash(outcome.value.snapshot.hash);
        setPhase("result");
      } else {
        const reason = outcome.reason instanceof Error ? outcome.reason.message : "resolution failed";
        setError(reason.toUpperCase().replace(/\s+/g, "_"));
        setPhase("idle");
      }
    } finally {
      clearInterval(progressTimer);
      busyRef.current = false;
    }
  }, [constraints]);

  // idle-state hash ambience (right panel placeholder)
  useEffect(() => {
    if (phase !== "idle") return;
    setHash("AWAITING SNAPSHOT");
  }, [phase]);

  const set = (patch: Partial<CapacityConstraints>) =>
    setConstraints((c) => ({ ...c, ...patch }));

  return (
    <section
      id="live-capacity"
      className={`relative grid-gold noise scanlines overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="Live capacity — interactive preview"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="04" name="LIVE CAPACITY" tone="gold" />
        <h2 className="font-display section-word mt-4 text-plimsoll-black">
          LIVE <span className="text-outline">CAPACITY</span>
        </h2>
        <motion.p
          {...reveal(0.1)}
          className="mt-5 font-code text-[10px] sm:text-xs tracking-[0.2em] text-plimsoll-black/70"
        >
          DECLARE YOUR CONSTRAINTS. THE BOOK DECIDES THE REST.
        </motion.p>

        <div className="mt-10 sm:mt-14 grid lg:grid-cols-2 gap-6 items-stretch">
          {/* ── left: constraints console ── */}
          <motion.div
            {...reveal()}
            className="corner-frame-4 text-plimsoll border border-plimsoll/40 bg-plimsoll-black/95 p-5 sm:p-7 flex flex-col"
          >
            <Corners tone="gold" />
            <div className="flex items-center justify-between font-code text-[10px] sm:text-[11px] tracking-[0.3em]">
              <span className="text-plimsoll">CONSTRAINTS</span>
              <span className="text-white/30">SPEC/07</span>
            </div>

            {/* symbol selector */}
            <div className="mt-5" role="group" aria-label="Symbol">
              <div className="font-code text-[9px] tracking-[0.25em] text-white/40 mb-2">SYMBOL</div>
              <div className="grid grid-cols-7 gap-1">
                {ASSETS.map((a) => {
                  const selected = constraints.symbol === a.symbol;
                  return (
                    <button
                      key={a.symbol}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => set({ symbol: a.symbol })}
                      className={`flex flex-col items-center gap-1 py-2 border transition-colors ${
                        selected
                          ? "border-plimsoll bg-plimsoll/15 text-plimsoll"
                          : "border-white/10 text-white/45 hover:border-plimsoll/50 hover:text-plimsoll/80"
                      } ${focusGold}`}
                      aria-label={`Select ${a.symbol}`}
                    >
                      <img src={a.icon} alt="" className="w-4 h-4" draggable={false} loading="lazy" />
                      <span className="font-code text-[8px] tracking-[0.08em]">{a.base}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* steppers */}
            <div className="mt-6 space-y-5 flex-1">
              {STEPPERS.map((spec) => (
                <StepperRow
                  key={spec.key}
                  spec={spec}
                  value={constraints[spec.key]}
                  onChange={(v) => set({ [spec.key]: v } as Partial<CapacityConstraints>)}
                />
              ))}
            </div>

            {/* compute */}
            <div className="mt-7">
              {stale && (
                <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/70 mb-2" role="status">
                  CONSTRAINTS CHANGED — RECOMPUTE
                </div>
              )}
              <button
                type="button"
                onClick={compute}
                disabled={phase === "generating"}
                className={`tech-box-dark w-full font-code text-xs sm:text-sm tracking-[0.2em] ${
                  phase === "generating" ? "opacity-50 pointer-events-none" : ""
                } ${focusGold}`}
                aria-label="Compute capacity"
              >
                <span aria-hidden>&gt;_</span>COMPUTE_CAPACITY<span className="caret" aria-hidden />
              </button>
              <div className="mt-3 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/30">
                POST /v1/intent · CONSTRAINTS ARE DECLARED, NEVER GUESSED
              </div>
              {error && (
                <p role="alert" className="mt-2 font-code text-[10px] tracking-[0.15em] text-rose-400">
                  ERR: {error} — ADJUST AND RETRY
                </p>
              )}
            </div>
          </motion.div>

          {/* ── right: idle / generating / result ── */}
          <motion.div {...reveal(0.12)} className="corner-frame-4 text-plimsoll border border-plimsoll/40 bg-plimsoll-black/95 p-5 sm:p-7 relative min-h-[520px]">
            <Corners tone="gold" />
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="h-full flex flex-col items-center justify-center text-center py-6"
                >
                  <div className="font-code text-sm sm:text-base tracking-[0.25em] text-plimsoll">
                    [ AWAITING_CONSTRAINTS<span className="caret" aria-hidden /> ]
                  </div>
                  <motion.img
                    src="/agents/agent-cartographer.png"
                    alt="Cartographer — the measurer entity, waiting for declared constraints"
                    draggable={false}
                    loading="lazy"
                    className="w-44 sm:w-56 h-auto my-6 drop-shadow-[0_18px_50px_rgba(6,7,12,0.9)]"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <p className="font-grotesk text-[12px] sm:text-[14px] leading-relaxed text-white/60 max-w-xs">
                    Your capacity is generated from the constraints you declare — not from the
                    ones you discover at the exit.
                  </p>
                  <div className="mt-5 font-code text-[8px] tracking-[0.2em] text-plimsoll/40">
                    SNAPSHOT {hash}
                  </div>
                </motion.div>
              )}

              {phase === "generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="h-full flex flex-col font-code"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/70">
                    <span>RESOLVING · {constraints.symbol}</span>
                    <span className="blink" aria-hidden>
                      ◆
                    </span>
                  </div>

                  <div className="mt-6 flex items-baseline gap-3">
                    <span className="text-[10px] tracking-[0.25em] text-white/50">COMPLETION</span>
                    <span className="font-display text-4xl sm:text-5xl text-plimsoll tabular-nums">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <div className="mt-3 h-3 border border-plimsoll/30 relative overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-plimsoll"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  <div className="mt-6 space-y-2 text-[10px] sm:text-[11px] tracking-[0.12em]">
                    <div className="text-white/60">
                      <span className="text-plimsoll/70">&gt;</span> INIT CONSTRAINT SET ............ OK
                    </div>
                    <div className="text-white/60">
                      <span className="text-plimsoll/70">&gt;</span> WALKING VISIBLE BID BOOK · 1000 LEVELS
                    </div>
                    <div className="text-white/60">
                      <span className="text-plimsoll/70">&gt;</span> SNAPSHOT HASH{" "}
                      <span className="text-plimsoll tabular-nums">{hash}</span>
                    </div>
                    <div className="text-white/40">
                      <span className="text-plimsoll/70">&gt;</span> STALE FEEDS REFUSE ACTION
                    </div>
                  </div>

                  <div className="mt-auto pt-6 text-[9px] tracking-[0.25em] text-plimsoll/50 blink">
                    DO NOT REFRESH — THE BOOK IS MOVING
                  </div>
                </motion.div>
              )}

              {phase === "result" && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: BEZIER }}
                  className="corner-frame-4 text-plimsoll-black scanlines bg-plimsoll relative -m-2 p-4 sm:p-6"
                >
                  <span aria-hidden className="cf cf-tl border-plimsoll-black" />
                  <span aria-hidden className="cf cf-tr border-plimsoll-black" />
                  <span aria-hidden className="cf cf-bl border-plimsoll-black" />
                  <span aria-hidden className="cf cf-br border-plimsoll-black" />

                  <div className="relative z-10">
                    {/* header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-code text-[9px] sm:text-[10px] tracking-[0.25em]">
                        ESTIMATED EXIT CAPACITY
                      </span>
                      <span
                        className={`font-code text-[9px] tracking-[0.2em] px-2 py-0.5 border ${
                          result.classification === "LIVE"
                            ? "border-plimsoll-black text-plimsoll-black"
                            : "border-plimsoll-black/30 text-plimsoll-black/50"
                        }`}
                      >
                        {result.classification}
                      </span>
                    </div>

                    {/* the number */}
                    <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                      <span className="font-display text-4xl sm:text-6xl leading-none">
                        {fmtUsdFull(result.exitCapacity)}
                      </span>
                      <span className="font-code text-[10px] sm:text-xs tracking-[0.2em]">
                        {result.symbol}
                      </span>
                    </div>
                    <div className="mt-2 font-code text-[9px] sm:text-[10px] tracking-[0.2em] text-plimsoll-black/60">
                      REQUESTED {fmtUsdFull(result.requestedNotional)} · UTILIZATION{" "}
                      {result.utilization.toFixed(1)}%
                    </div>

                    {/* capacity bars */}
                    <div className="mt-5 space-y-3">
                      <CapacityBar
                        label="COST"
                        value={result.costCapacity}
                        requested={result.requestedNotional}
                        binding={result.binding === "COST"}
                      />
                      <CapacityBar
                        label="TIME"
                        value={result.timeCapacity}
                        requested={result.requestedNotional}
                        binding={result.binding === "TIME"}
                      />
                      <CapacityBar
                        label="BOOK"
                        value={result.bookCapacity}
                        requested={result.requestedNotional}
                        binding={result.binding === "BOOK"}
                      />
                    </div>

                    {/* status row */}
                    <div className="mt-5 flex flex-wrap gap-2 items-center">
                      <span
                        className={`font-code text-[9px] sm:text-[10px] tracking-[0.2em] px-2 py-1 ${
                          result.status === "OVER_CAPACITY"
                            ? "bg-plimsoll-black text-plimsoll"
                            : "border border-plimsoll-black/60 text-plimsoll-black"
                        }`}
                      >
                        {result.status.replace("_", " ")}
                      </span>
                      <span className="font-code text-[9px] sm:text-[10px] tracking-[0.2em] px-2 py-1 border border-plimsoll-black/60">
                        RECOMMENDATION: {result.recommendation}
                      </span>
                      <span className="font-code text-[9px] sm:text-[10px] tracking-[0.2em] px-2 py-1 bg-plimsoll-black text-plimsoll">
                        BINDING: {result.binding}
                      </span>
                    </div>

                    {/* narrative */}
                    <p className="mt-4 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-plimsoll-black/85">
                      {result.narrative}
                    </p>

                    {/* snapshot footer */}
                    <div className="mt-4 pt-3 border-t border-plimsoll-black/25 font-code text-[8px] sm:text-[9px] tracking-[0.15em] text-plimsoll-black/55 flex flex-wrap gap-x-4 gap-y-1">
                      <span>SNAPSHOT {result.snapshot.hash}</span>
                      <span>MID {result.snapshot.mid.toFixed(4)}</span>
                      <span>SPREAD {result.snapshot.spreadBps.toFixed(1)} BPS</span>
                      <span>24QV {fmtUsdFull(result.snapshot.quoteVolume24h)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── stepper row ── */
function StepperRow({
  spec,
  value,
  onChange,
}: {
  spec: StepperSpec;
  value: number;
  onChange: (v: number) => void;
}) {
  const canDown = value - spec.step >= spec.min - 1e-9;
  const canUp = value + spec.step <= spec.max + 1e-9;
  const on = Math.round(((value - spec.min) / (spec.max - spec.min)) * SEGMENTS);

  const clamp = (v: number) => Math.min(spec.max, Math.max(spec.min, v));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="font-code text-[10px] tracking-[0.2em] text-white/55" id={`lbl-${spec.key}`}>
          {spec.label}
        </label>
        <span className="font-code text-[11px] text-plimsoll tabular-nums">{spec.fmt(value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - spec.step))}
          disabled={!canDown}
          aria-label={`Decrease ${spec.label}`}
          aria-labelledby={`lbl-${spec.key}`}
          className={`w-8 h-8 shrink-0 flex items-center justify-center border transition-colors ${
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
          onClick={() => onChange(clamp(value + spec.step))}
          disabled={!canUp}
          aria-label={`Increase ${spec.label}`}
          aria-labelledby={`lbl-${spec.key}`}
          className={`w-8 h-8 shrink-0 flex items-center justify-center border transition-colors ${
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

/* ── capacity bar on the gold result panel ── */
function CapacityBar({
  label,
  value,
  requested,
  binding,
}: {
  label: string;
  value: number;
  requested: number;
  binding: boolean;
}) {
  const frac = value > 0 ? Math.min(1, requested / value) : 1;
  const on = Math.max(binding ? SEGMENTS : 1, Math.ceil(frac * SEGMENTS));
  return (
    <div className="flex items-center gap-3">
      <span
        className={`font-code text-[9px] sm:text-[10px] tracking-[0.2em] w-10 shrink-0 ${
          binding ? "text-plimsoll-black font-bold" : "text-plimsoll-black/60"
        }`}
      >
        {label}
      </span>
      <div className="seg-bar seg-bar-dark flex-1 h-2 min-w-0" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={i < on ? "on" : ""} />
        ))}
      </div>
      <span className="font-code text-[9px] sm:text-[10px] tabular-nums w-16 text-right shrink-0">
        {fmtUsdFull(value)}
      </span>
      {binding && (
        <span className="font-code text-[8px] tracking-[0.15em] bg-plimsoll-black text-plimsoll px-1.5 py-0.5 shrink-0">
          BINDS
        </span>
      )}
    </div>
  );
}
