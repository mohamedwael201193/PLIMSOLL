"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Minus, Plus, Power, ShieldCheck } from "lucide-react";
import { DEFAULT_CONSTRAINTS } from "@/lib/capacity";
import { useToast } from "@/hooks/use-toast";
import { Corners, reveal, focusGold } from "../landing/shared";
import { ConnectPanel } from "../ConnectPanel";
import { useAccount } from "@/lib/useAccount";

interface Props {
  glitch: boolean;
}

interface Constitution {
  targetNotional: number;
  maxExitCostBps: number;
  exitHorizonDays: number;
  participationPct: number;
  bookFractionPct: number;
}

interface StepperSpec {
  key: keyof Constitution;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
}

const SEGMENTS = 24;

const STEPPERS: StepperSpec[] = [
  {
    key: "targetNotional",
    label: "TARGET_NOTIONAL",
    hint: "The exposure you want to hold or add, in quote notional.",
    min: 500,
    max: 100_000,
    step: 500,
    fmt: (v) => `$${v.toLocaleString("en-US")}`,
  },
  {
    key: "maxExitCostBps",
    label: "MAX_EXIT_COST",
    hint: "Maximum all-in cost you are willing to tolerate when exiting.",
    min: 10,
    max: 200,
    step: 5,
    fmt: (v) => `${v} BPS`,
  },
  {
    key: "exitHorizonDays",
    label: "EXIT_HORIZON",
    hint: "How many days you allow for that exit.",
    min: 0.25,
    max: 7,
    step: 0.25,
    fmt: (v) => `${v.toFixed(2)} DAYS`,
  },
  {
    key: "participationPct",
    label: "PARTICIPATION",
    hint: "How much of recent market volume you are willing to represent.",
    min: 1,
    max: 30,
    step: 1,
    fmt: (v) => `${v} % ADV`,
  },
  {
    key: "bookFractionPct",
    label: "BOOK_FRACTION",
    hint: "How much of currently visible bids you are willing to rely on.",
    min: 1,
    max: 100,
    step: 1,
    fmt: (v) => `${v} % BOOK`,
  },
];

const DEFAULTS: Constitution = {
  targetNotional: DEFAULT_CONSTRAINTS.targetNotional,
  maxExitCostBps: DEFAULT_CONSTRAINTS.maxExitCostBps,
  exitHorizonDays: DEFAULT_CONSTRAINTS.exitHorizonDays,
  participationPct: DEFAULT_CONSTRAINTS.participationPct,
  bookFractionPct: DEFAULT_CONSTRAINTS.bookFractionPct,
};

const STORAGE_KEY = "plimsoll-constitution";
const SAFE_MODE_KEY = "plimsoll-safe-mode";

const clampToSpec = (spec: StepperSpec, v: number): number =>
  Math.min(spec.max, Math.max(spec.min, v));

/** Type-guarded parse — corrupted payloads fall back to defaults. */
function sanitizeConstitution(raw: unknown): Constitution | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  const next: Constitution = { ...DEFAULTS };
  let anyValid = false;
  for (const spec of STEPPERS) {
    const v = rec[spec.key];
    if (typeof v === "number" && Number.isFinite(v)) {
      next[spec.key] = clampToSpec(spec, v);
      anyValid = true;
    }
  }
  return anyValid ? next : null;
}

/** Client-only read (SSR returns defaults — these views mount after the gate). */
function readConstitution(): Constitution {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return sanitizeConstitution(JSON.parse(raw) as unknown) ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function readSafeModeFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SAFE_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function SettingsPage({ glitch }: Props) {
  // SSR-safe lazy hydration: these views mount client-side after the warning gate,
  // so the initializers read localStorage exactly once at first client render.
  const [constitution, setConstitution] = useState<Constitution>(readConstitution);
  const [safeMode, setSafeMode] = useState<boolean>(readSafeModeFlag);
  const [armed, setArmed] = useState(false);
  const { toast } = useToast();
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const account = useAccount();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const oauth = q.get("oauth");
    if (!oauth) return;
    const reason = q.get("reason") || "";
    if (oauth === "ok") {
      toast({ title: "OAUTH RETURNED", description: "Oregon stored the session server-side. Reading the Agentic account." });
      void account.refresh();
    } else if (oauth === "denied") {
      toast({
        title: "AUTHORIZATION NOT COMPLETED",
        description: reason || "Binance authorization was not completed.",
      });
    } else {
      toast({
        title: "AGENTIC ACCOUNT UNREACHABLE",
        description: reason || "Agentic account could not be reached.",
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("oauth");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    // account.refresh is stable enough for this one-shot query consume
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // disarm timer cleanup
  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    []
  );

  // persist the constitution on every change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(constitution));
    } catch {
      /* storage unavailable — settings stay in memory for this session */
    }
  }, [constitution]);

  const setValue = (spec: StepperSpec, v: number) => {
    setConstitution((c) => ({ ...c, [spec.key]: clampToSpec(spec, v) }));
  };

  const toggleSafeMode = () => {
    const next = !safeMode;
    setSafeMode(next);
    try {
      window.localStorage.setItem(SAFE_MODE_KEY, next ? "1" : "0");
      window.dispatchEvent(new Event("plimsoll-motion"));
    } catch {
      /* storage unavailable — toggle applies to this session only */
    }
  };

  // two-click confirm pattern: first click arms, second click resets
  const onReset = () => {
    if (!armed) {
      setArmed(true);
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
      disarmTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    setArmed(false);
    setConstitution(DEFAULTS);
    const t = toast({
      title: "CONSTITUTION RESET",
      description: "Defaults restored — 10% ADV participation · 50 BPS exit cost · 1 day horizon.",
    });
    window.setTimeout(() => t.dismiss(), 5000);
  };

  return (
    <main
      id="settings"
      className={`grid-dark-dense noise relative overflow-hidden pt-28 sm:pt-32 pb-16 ${glitch ? "glitch-on" : ""}`}
      aria-label="Settings — your constitution"
    >
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-8">
        {/* top meta row */}
        <div className="flex justify-between items-center font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/60">
          <span>SETTINGS_CONSOLE</span>
          <span className="hidden sm:inline">LOCAL_PERSISTENCE</span>
          <span>NO_SECRETS_HELD</span>
        </div>

        {/* header */}
        <header className="mt-4">
          <span className="font-code text-[10px] tracking-[0.3em] text-plimsoll/60">
            [ YOUR_CONSTITUTION — THE CONSTRAINT SET ]
          </span>
          <h1 className="font-display section-word mt-4 text-white">
            SETTINGS —<br />
            <span className="text-outline-gold">YOUR CONSTITUTION</span>
          </h1>
          <motion.p {...reveal(0.1)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/60 max-w-xl">
            PLIMSOLL estimates how much exposure the market can support under your stated exit constraints — and keeps re-solving as conditions change.
          </motion.p>
        </header>

        <div className="mt-10">
          <ConnectPanel account={account} />
        </div>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          {/* ── left: the constraint set ── */}
          <motion.div
            {...reveal()}
            className="corner-frame-4 text-plimsoll border border-plimsoll/40 bg-plimsoll-black/95 p-5 sm:p-7"
          >
            <Corners tone="gold" />
            <div className="flex flex-wrap items-center justify-between gap-2 font-code text-[10px] sm:text-[11px] tracking-[0.3em]">
              <span className="text-plimsoll">CONSTRAINT_SET</span>
              <span className="text-white/30">CONSTITUTION/03</span>
            </div>

            <div className="mt-6 space-y-5">
              {STEPPERS.map((spec) => (
                <StepperRow
                  key={spec.key}
                  spec={spec}
                  value={constitution[spec.key]}
                  modified={constitution[spec.key] !== DEFAULTS[spec.key]}
                  onChange={setValue}
                />
              ))}
            </div>

            <div className="mt-7 pt-4 border-t border-plimsoll/15 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/30 leading-relaxed">
              PERSISTED: LOCALSTORAGE / PLIMSOLL-CONSTITUTION
              <br />A USER-CONTROLLED ASSUMPTION — NOT A HIDDEN CONSTANT
            </div>
          </motion.div>

          {/* ── right: toggles, danger zone, guarantee ── */}
          <div className="space-y-6">
            <motion.div {...reveal(0.08)} className="border border-plimsoll/25 bg-plimsoll-black/60">
              <div className="border-b border-plimsoll/15 p-4 sm:p-5 font-code text-[10px] sm:text-[11px] tracking-[0.3em] text-plimsoll">
                [ OPERATOR_TOGGLES ]
              </div>

              {/* WRITES_ENABLED — locked OFF */}
              <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-plimsoll/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll">
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    WRITES_ENABLED
                  </div>
                  <p className="mt-1.5 font-grotesk text-[12px] text-white/55 leading-relaxed">
                    Display-only from Oregon GET /health. Writes can never be enabled from this page.
                  </p>
                </div>
                <Switch id="writes-enabled" label="Writes enabled — locked" checked={account.writesEnabled} disabled />
              </div>

              {/* KILL_SWITCH — display only */}
              <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-plimsoll/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll">
                    <Power className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    KILL_SWITCH
                    <span className="font-code text-[8px] tracking-[0.15em] border border-plimsoll/40 text-plimsoll/70 px-1.5 py-0.5">
                      {account.killSwitch ? "HALTED" : "MONITORED"}
                    </span>
                  </div>
                  <p className="mt-1.5 font-grotesk text-[12px] text-white/55 leading-relaxed">
                    Display-only. The desk watches the write path — there is nothing to toggle
                    here.
                  </p>
                </div>
                <Switch id="kill-switch" label="Kill switch — monitored, display only" checked={account.killSwitch} disabled />
              </div>

              {/* SAFE_MODE — interactive */}
              <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll">
                    REDUCED MOTION
                  </div>
                  <p className="mt-1.5 font-grotesk text-[12px] text-white/55 leading-relaxed">
                    Turns off CRT overlay, glitch, and custom cursor. Also follows your system prefers-reduced-motion setting.
                  </p>
                </div>
                <Switch
                  id="safe-mode"
                  label="Reduced motion — disable CRT and glitch effects"
                  checked={safeMode}
                  onChange={toggleSafeMode}
                />
              </div>
            </motion.div>

            {/* DANGER ZONE */}
            <motion.div {...reveal(0.14)} className="border border-rose-400/40 p-5 sm:p-6">
              <div className="font-code text-[10px] tracking-[0.3em] text-rose-300/80">[ DANGER_ZONE ]</div>
              <p className="mt-3 font-grotesk text-[12px] sm:text-[13px] text-white/60 leading-relaxed">
                RESET CONSTITUTION restores the desk defaults — $10,000 target, 50 BPS exit cost,
                1 day horizon, 10% ADV participation, 50% book fraction. There is no undo, only
                re-declaring.
              </p>
              <button
                type="button"
                onClick={onReset}
                aria-label="Reset constitution — click twice to confirm"
                className={`mt-4 font-code text-[10px] sm:text-[11px] tracking-[0.2em] px-4 py-2.5 border transition-colors ${
                  armed
                    ? "border-rose-400/70 bg-rose-400/15 text-rose-300"
                    : "border-rose-400/50 text-rose-300/90 hover:bg-rose-400/10"
                } ${focusGold}`}
              >
                {armed ? "CLICK AGAIN TO CONFIRM" : "RESET CONSTITUTION"}
              </button>
              {armed && (
                <div className="mt-2 font-code text-[9px] tracking-[0.2em] text-rose-300/80 blink" role="status">
                  ARMED — 4 SECONDS TO CONFIRM
                </div>
              )}
            </motion.div>

            {/* footer guarantee */}
            <motion.div {...reveal(0.2)} className="flex items-start gap-3 px-1">
              <ShieldCheck className="w-4 h-4 text-plimsoll/60 mt-0.5 shrink-0" strokeWidth={1.5} aria-hidden />
              <p className="font-grotesk text-[12px] text-white/45 leading-relaxed">
                Settings persist locally in your browser. The desk never holds Binance secrets.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── local stepper (landing pattern: ± buttons + segmented bar) ── */
function StepperRow({
  spec,
  value,
  modified,
  onChange,
}: {
  spec: StepperSpec;
  value: number;
  modified: boolean;
  onChange: (spec: StepperSpec, v: number) => void;
}) {
  const canDown = value - spec.step >= spec.min - 1e-9;
  const canUp = value + spec.step <= spec.max + 1e-9;
  const on = Math.round(((value - spec.min) / (spec.max - spec.min)) * SEGMENTS);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-code text-[10px] tracking-[0.2em] text-white/55" id={`lbl-${spec.key}`}>
            {spec.label}
          </span>
          {modified && (
            <span className="font-code text-[7px] tracking-[0.15em] border border-plimsoll/40 text-plimsoll/60 px-1 py-0.5 shrink-0">
              MODIFIED
            </span>
          )}
        </span>
        <span className="font-code text-[11px] text-plimsoll tabular-nums shrink-0">{spec.fmt(value)}</span>
      </div>
      <p className="mb-2 font-grotesk text-[11px] leading-snug text-white/45">{spec.hint}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(spec, value - spec.step)}
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
          onClick={() => onChange(spec, value + spec.step)}
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

/* ── local switch — square, gold, no rounding ── */
function Switch({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative w-14 h-7 border transition-colors shrink-0 ${
        checked ? "border-plimsoll bg-plimsoll/15" : "border-white/25 bg-plimsoll-black"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-plimsoll/60"} ${focusGold}`}
    >
      <span
        aria-hidden
        className={`absolute top-1 left-1 w-5 h-5 transition-transform duration-200 ${
          checked ? "translate-x-7 bg-plimsoll" : "bg-white/30"
        }`}
      />
    </button>
  );
}
