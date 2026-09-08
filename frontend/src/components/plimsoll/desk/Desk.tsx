"use client";

/**
 * THE DESK — an operating instrument for exposure.
 * Declares constraints, re-solves capacity, shows where the line is.
 * Nothing here computes capacity; every number comes from /api/capacity.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { AGENTS, AGENT_LOOP } from "@/lib/agents";
import { ASSETS, DEFAULT_CONSTRAINTS } from "@/lib/capacity";
import { getFills, getHealth, postApproval, postExecute, postPrepare, postResolve } from "@/lib/oregon";
import { useAccount } from "@/lib/useAccount";
import { useCapacity, useCapacityHistory, type ObservationRow } from "./useCapacity";
import {
  BEZIER,
  CapacityBarsCard,
  CapacityChartCard,
  CapacityReadout,
  ConstraintsPanel,
  Corners,
  SectionLabel,
  focusGold,
  fmtClock,
} from "./shared";
import { useToast } from "@/hooks/use-toast";

interface Props {
  glitch: boolean;
  symbol?: string;
}

/* decision row — labels match the desk; the backend action is authoritative */
const ACTIONS: { key: string; action: string }[] = [
  { key: "ACCEPT", action: "FILL_AS_ASKED" },
  { key: "REDUCE", action: "SIZE_DOWN" },
  { key: "STAGE", action: "STAGE" },
  { key: "WAIT", action: "WAIT" },
  { key: "REFUSE", action: "REFUSE" },
];

/* agent loop → entity mapping (lib/agents); ASK is the operator gate */
const LOOP_AGENT: Partial<Record<string, string>> = {};
const LOOP_LINE: Partial<Record<string, string>> = {};
for (const a of AGENTS) {
  LOOP_AGENT[a.loop] = a.name;
  LOOP_LINE[a.loop] = a.line;
}
LOOP_AGENT.ASK = "OPERATOR";

export default function Desk({ glitch, symbol }: Props) {
  const cap = useCapacity(
    symbol ? { initial: { ...DEFAULT_CONSTRAINTS, symbol } } : undefined
  );
  const hist = useCapacityHistory(cap.constraints.symbol);
  const account = useAccount();
  const { toast } = useToast();
  const [approval, setApproval] = useState<{
    approval_id: string;
    confirmation_token: string;
    snapshot_hash: string;
    expires_at: string;
    note?: string;
  } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [execBusy, setExecBusy] = useState(false);
  const [execResult, setExecResult] = useState<string | null>(null);

  const backendAction = String(
    (cap.raw as { decision?: { action?: string } } | null)?.decision?.action || cap.result?.recommendation || ""
  );

  // keep the observation log fresh after every solve
  useEffect(() => {
    if (!cap.result) return;
    void hist.refresh();
  }, [cap.result, hist.refresh]);

  // follow an explicit symbol prop if the shell provides one
  const symbolPropRef = useRef(symbol);
  useEffect(() => {
    if (symbol && symbol !== symbolPropRef.current) {
      symbolPropRef.current = symbol;
      cap.patch({ symbol });
    }
  }, [symbol, cap.patch]);

  const onDecision = async (key: string, mappedAction: string) => {
    if (!cap.result || !cap.raw) {
      toast({ title: "SOLVE FIRST", description: "Ask PLIMSOLL before recording a decision." });
      return;
    }
    if (key === "WAIT" || key === "REFUSE") {
      toast({
        title: key,
        description: "No financial write. The operator declined to proceed on this snapshot.",
      });
      setApproval(null);
      return;
    }
    const decision = (cap.raw as { decision?: unknown }).decision;
    if (!decision) {
      toast({ title: "NO DECISION PAYLOAD", description: "Oregon did not return a decision to approve." });
      return;
    }
    try {
      const issued = await postApproval(decision);
      setApproval(issued);
      setConfirmText("");
      setExecResult(null);
      toast({
        title: `${key} — APPROVAL ISSUED`,
        description: issued.note || "Token is not a financial write. Type CONFIRM to execute.",
      });
    } catch (e) {
      toast({
        title: "APPROVAL FAILED",
        description: e instanceof Error ? e.message : "approval failed",
      });
    }
  };

  const onConfirmExecute = async () => {
    if (!approval || !cap.result) return;
    if (confirmText.trim() !== "CONFIRM") {
      toast({ title: "CONFIRM_REQUIRED", description: "Type CONFIRM exactly. Real funds will be used." });
      return;
    }
    setExecBusy(true);
    setExecResult(null);
    try {
      const prepared = await postPrepare(cap.result.symbol);
      if (!prepared.legal || !prepared.order) {
        setExecResult(prepared.unavailable || "LIVE MICRO-EXECUTION UNAVAILABLE");
        return;
      }
      const body = await postExecute({
        confirm: "CONFIRM",
        confirmation_token: approval.confirmation_token,
        snapshot_hash: approval.snapshot_hash,
        symbol: prepared.symbol,
        quote_order_qty: prepared.order.quote_order_qty ? String(prepared.order.quote_order_qty) : undefined,
        quantity: prepared.order.quantity ? String(prepared.order.quantity) : undefined,
      });
      const rec = body.reconciliation as { ok?: boolean; status?: string } | undefined;
      const fill = body.fill as { status?: string; executed_qty?: string; orig_qty?: string; partial?: boolean } | undefined;
      if (body.partial || fill?.partial) {
        setExecResult("PARTIAL FILL — remaining size needs a new approval. Not full success.");
      } else if (rec && rec.ok === false) {
        setExecResult("RECONCILIATION REQUIRED — order read-back did not match the write.");
      } else if (body.readback_present && body.account_read_present) {
        setExecResult(
          `EXECUTED · ORDER ${body.fill?.order_id || body.client_order_id} · ${fill?.status || "READ BACK"}`
        );
        await postResolve(cap.constraints);
        await cap.compute();
        await hist.refresh();
      } else {
        setExecResult("EXECUTION STATE UNKNOWN — do not retry. Read the order first.");
      }
      setApproval(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "execute failed";
      if (msg.includes("WRITES_DISABLED")) {
        setExecResult("WRITES_DISABLED on Oregon. Approval was recorded. No order was sent.");
      } else if (msg.includes("CONFIRM_REQUIRED")) {
        setExecResult("CONFIRM_REQUIRED — type CONFIRM exactly.");
      } else {
        setExecResult(msg);
      }
    } finally {
      setExecBusy(false);
    }
  };

  return (
    <main
      id="desk"
      className={`relative grid-dark-dense noise scanlines overflow-hidden pt-28 sm:pt-32 pb-16 ${
        glitch ? "glitch-on" : ""
      }`}
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        {/* desk header */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <SectionLabel index="01" name="OPERATOR DESK" />
            <h1 className="mt-2 font-display text-2xl sm:text-4xl leading-none text-white">
              <span className="glitch-text" data-text="THE DESK">
                THE DESK
              </span>
            </h1>
          </div>
          <p className="font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/50">
            AN OPERATING INSTRUMENT FOR EXPOSURE
            <span className="hidden sm:inline"> — DECLARE · RE-SOLVE · DECIDE</span>
          </p>
        </div>

        <div className="mt-6 sm:mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-5 sm:gap-6 items-start">
          {/* ── left: instrument ── */}
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <CapacityReadout
              result={cap.result}
              loading={cap.loading}
              header={
                <AssetSelector
                  symbol={cap.constraints.symbol}
                  onSelect={(s) => {
                    cap.patch({ symbol: s });
                    void cap.compute({ ...cap.constraints, symbol: s });
                  }}
                />
              }
            />

            <CapacityBarsCard result={cap.result} />

            <ConstraintsPanel
              constraints={cap.constraints}
              onPatch={cap.patch}
              onCompute={() => void cap.compute()}
              loading={cap.loading}
              error={cap.error}
              stale={cap.stale}
              footerNote="POST /v1/intent · YOUR CONSTITUTION PERSISTS LOCALLY"
            />

            <CapacityChartCard history={hist.history} />
          </div>

          {/* ── right: the crew rail ── */}
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <AgentStateCard />

            <RecentSolvesCard observations={hist.history?.observations ?? []} loading={hist.loading} />

            <ExecutionStatusCard />
          </div>
        </div>

        {approval && cap.result && (
          <ConfirmExecutionPanel
            approval={approval}
            symbol={cap.result.symbol}
            confirmText={confirmText}
            onConfirmText={setConfirmText}
            busy={execBusy}
            onExecute={() => void onConfirmExecute()}
            onCancel={() => setApproval(null)}
          />
        )}
        {execResult && (
          <div className="mt-4 border border-plimsoll/40 bg-plimsoll/10 p-4 font-code text-[11px] tracking-[0.12em] text-plimsoll">
            {execResult}
          </div>
        )}

        {/* ── decision row ── */}
        <div className="mt-6 sm:mt-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-code text-[9px] tracking-[0.25em] text-plimsoll/50 mb-3">
            <span>DECISION</span>
            <span>
              {account.writesEnabled
                ? "LIVE WRITE REQUIRES TYPED CONFIRM"
                : "WRITES OFF — APPROVAL IS NOT AN ORDER"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ACTIONS.map((a, i) => {
              const suggested = backendAction === a.action || (a.key === "REDUCE" && backendAction === "TRIM_HELD");
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => void onDecision(a.key, a.action)}
                  className={`tech-box-dark font-code text-xs sm:text-sm tracking-[0.2em] ${focusGold} ${
                    i === ACTIONS.length - 1 ? "col-span-2 sm:col-span-1" : ""
                  } ${suggested ? "bg-plimsoll/15 border-plimsoll" : ""}`}
                  aria-label={`${a.key} — ${suggested ? "backend recommendation" : "operator decision"}`}
                >
                  {a.key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────────────────────────────
   asset selector — 24px icons, active = gold
   ─────────────────────────────────────────────── */

function AssetSelector({ symbol, onSelect }: { symbol: string; onSelect: (s: string) => void }) {
  return (
    <div className="mb-4 pb-4 border-b border-plimsoll/15" role="group" aria-label="Asset">
      <div className="font-code text-[9px] tracking-[0.25em] text-plimsoll/50 mb-2">ASSET</div>
      <div className="flex flex-wrap gap-1.5">
        {ASSETS.map((a) => {
          const active = a.symbol === symbol;
          return (
            <button
              key={a.symbol}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(a.symbol)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 border font-code text-[10px] tracking-[0.1em] transition-colors ${
                active
                  ? "bg-plimsoll text-plimsoll-black border-plimsoll"
                  : "border-plimsoll/25 text-plimsoll/60 hover:border-plimsoll/60 hover:text-plimsoll"
              } ${focusGold}`}
              aria-label={`Solve capacity for ${a.symbol}`}
            >
              <img src={a.icon} alt="" className="w-6 h-6" width={24} height={24} draggable={false} loading="lazy" />
              <span>{a.base}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   agent state — the loop rail, cycling every 2.5s
   ─────────────────────────────────────────────── */

function AgentStateCard() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % AGENT_LOOP.length), 2500);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section
      aria-label="Agent state"
      className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-black/95 p-4 sm:p-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Corners />
      <div className="flex items-center justify-between font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">AGENT STATE</span>
        <span className="text-white/30">
          {paused ? "PAUSED" : `STEP ${step + 1}/0${AGENT_LOOP.length}`}
        </span>
      </div>

      <p className="sr-only">
        The agent loop runs observe, understand, plan, decide, ask, act, verify and adapt, continuously.
      </p>

      <ol className="relative mt-4" aria-hidden="true">
        <span aria-hidden className="absolute left-[9px] top-3 bottom-3 w-px bg-plimsoll/15" />
        {AGENT_LOOP.map((name, i) => {
          const active = i === step;
          const agent = LOOP_AGENT[name];
          const line = LOOP_LINE[name];
          return (
            <li key={name} className="relative py-1.5 pl-1">
              {active && (
                <motion.span
                  layoutId="loop-cursor"
                  transition={{ duration: 0.45, ease: BEZIER }}
                  className="absolute inset-0 border border-plimsoll/30 bg-plimsoll/5"
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 shrink-0 ${active ? "bg-plimsoll" : "bg-plimsoll/20"}`} />
                <span
                  className={`font-code text-[10px] sm:text-[11px] tracking-[0.2em] ${
                    active ? "text-plimsoll" : "text-white/35"
                  }`}
                >
                  {name}
                </span>
                {agent && (
                  <span
                    className={`ml-auto font-code text-[8px] tracking-[0.15em] ${
                      active ? "text-plimsoll/60" : "text-white/25"
                    }`}
                  >
                    {agent}
                  </span>
                )}
              </div>
              {active && line && (
                <motion.p
                  key={name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="relative z-10 pl-[22px] mt-1 font-grotesk text-[11px] leading-snug text-white/50"
                >
                  {line}
                </motion.p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 pt-3 border-t border-plimsoll/10 font-code text-[8px] tracking-[0.2em] text-white/30 flex justify-between">
        <span>CYCLE 2.5S</span>
        <span>PAUSE ON HOVER</span>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   recent re-solves — observation log
   ─────────────────────────────────────────────── */

function RecentSolvesCard({
  observations,
  loading,
}: {
  observations: ObservationRow[];
  loading: boolean;
}) {
  return (
    <section aria-label="Recent re-solves" className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-black/95 p-4 sm:p-6">
      <Corners />
      <div className="flex items-center justify-between font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">RECENT RE-SOLVES</span>
        <span className="text-white/30">LOG</span>
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto scroll-thin -mx-1 px-1">
        {observations.length === 0 ? (
          loading ? (
            <div className="py-8 text-center font-code text-[10px] tracking-[0.25em] text-plimsoll/50 blink">
              LOADING OBSERVATIONS…
            </div>
          ) : (
            <div className="py-8 text-center font-code text-[10px] tracking-[0.2em] text-plimsoll/50">
              NO QUERIES THIS SESSION
              <div className="mt-2 text-plimsoll/35">[ AWAITING_ALLOCATION ]</div>
            </div>
          )
        ) : (
          <ul className="divide-y divide-plimsoll/10">
            {observations.map((o) => (
              <li
                key={`${o.createdAt}-${o.hash}`}
                className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-code text-[9px] tracking-[0.1em]"
              >
                <span className="text-plimsoll">{o.symbol}</span>
                <span className="text-white/40">{o.hash}</span>
                <span className="ml-auto text-white/55">{o.binding}</span>
                <span className={o.classification === "LIVE" ? "text-emerald-400/80" : "text-plimsoll/40"}>
                  {o.classification}
                </span>
                <span className="text-white/35">{fmtClock(o.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────
   execution status — fail-closed, confirm-gated
   ─────────────────────────────────────────────── */

function ExecutionStatusCard() {
  const [rows, setRows] = useState<
    { label: string; value: string; tone: "gold" | "dim" | "none" }[]
  >([
    { label: "WRITES", value: "…", tone: "gold" },
    { label: "KILL_SWITCH", value: "…", tone: "dim" },
    { label: "MCP", value: "…", tone: "dim" },
    { label: "LAST READ-BACK", value: "—", tone: "none" },
  ]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const [health, fills] = await Promise.all([getHealth(), getFills().catch(() => ({ fills: [] }))]);
        const last = fills.fills[fills.fills.length - 1];
        if (!alive) return;
        setRows([
          { label: "WRITES", value: health.writes_enabled ? "ON" : "OFF", tone: "gold" },
          { label: "KILL_SWITCH", value: health.kill_switch ? "HALTED" : "MONITORED", tone: "dim" },
          { label: "MCP", value: health.mcp_bound ? "BOUND" : "NOT BOUND", tone: "dim" },
          {
            label: "LAST READ-BACK",
            value: last ? `${last.status} ${last.order_id || last.client_order_id}` : "—",
            tone: "none",
          },
        ]);
      } catch {
        if (alive) {
          setRows([
            { label: "WRITES", value: "UNKNOWN", tone: "gold" },
            { label: "KILL_SWITCH", value: "UNKNOWN", tone: "dim" },
            { label: "MCP", value: "UNREACHABLE", tone: "dim" },
            { label: "LAST READ-BACK", value: "—", tone: "none" },
          ]);
        }
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-label="Execution status" className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-black/95 p-4 sm:p-6">
      <Corners />
      <div className="flex items-center justify-between font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">EXECUTION STATUS</span>
        <span className="text-white/30">FAIL-CLOSED</span>
      </div>

      <ul className="mt-3 divide-y divide-plimsoll/10">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between py-2 font-code text-[9px] sm:text-[10px] tracking-[0.15em]">
            <span className="text-white/45">{r.label}</span>
            {r.tone === "none" ? (
              <span className="text-white/40">{r.value}</span>
            ) : (
              <span
                className={
                  r.tone === "gold"
                    ? "px-2 py-0.5 border border-plimsoll/50 text-plimsoll bg-plimsoll/10"
                    : "px-2 py-0.5 border border-plimsoll/25 text-plimsoll/60"
                }
              >
                {r.value}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 border border-plimsoll/40 bg-plimsoll/10 p-3 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-plimsoll shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
        <div>
          <div className="font-code text-[9px] sm:text-[10px] tracking-[0.2em] text-plimsoll">REQUIRES CONFIRM</div>
          <p className="mt-1 font-grotesk text-[11px] leading-snug text-white/60">
            No write leaves this desk without typing CONFIRM. Real funds will be used. The backend remains the authority.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConfirmExecutionPanel({
  approval,
  symbol,
  confirmText,
  onConfirmText,
  busy,
  onExecute,
  onCancel,
}: {
  approval: { approval_id: string; expires_at: string; snapshot_hash: string; note?: string };
  symbol: string;
  confirmText: string;
  onConfirmText: (v: string) => void;
  busy: boolean;
  onExecute: () => void;
  onCancel: () => void;
}) {
  const [prep, setPrep] = useState<Awaited<ReturnType<typeof postPrepare>> | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    postPrepare(symbol)
      .then((p) => {
        if (alive) setPrep(p);
      })
      .catch((e) => {
        if (alive) setPrepError(e instanceof Error ? e.message : "prepare failed");
      });
    return () => {
      alive = false;
    };
  }, [symbol]);

  return (
    <section
      aria-label="Confirm execution"
      className="mt-6 corner-frame-4 text-plimsoll border border-plimsoll/40 bg-plimsoll-ink p-4 sm:p-6"
    >
      <Corners />
      <div className="font-code text-[10px] tracking-[0.3em] text-plimsoll">REVIEW ACTION — CONFIRM EXECUTION</div>
      <p className="mt-3 font-grotesk text-[13px] text-white/70 leading-relaxed">
        Real funds will be used. Typing CONFIRM is the only way a Spot order leaves this desk.
      </p>
      {prepError && <p className="mt-3 font-code text-[10px] text-rose-300">{prepError}</p>}
      {prep && (
        <dl className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 font-code text-[10px] tracking-[0.12em]">
          <Row k="SYMBOL" v={prep.symbol} />
          <Row k="SIDE" v={prep.order?.side || "BUY"} />
          <Row k="TYPE" v={prep.order?.type || "MARKET"} />
          <Row k="NOTIONAL" v={prep.order ? String(prep.order.quote_order_qty || prep.order.notional) : "—"} />
          <Row k="USDT FREE" v={prep.usdt_free} />
          <Row k="MIN NOTIONAL" v={prep.filters.min_notional} />
          <Row k="AGENTIC" v={prep.account_kind || "—"} />
          <Row k="APPROVAL EXPIRY" v={approval.expires_at} />
          <Row k="SNAPSHOT" v={approval.snapshot_hash.slice(0, 18)} />
          <Row k="WRITES" v={prep.writes_enabled ? "ON" : "OFF"} />
        </dl>
      )}
      {prep && !prep.legal && (
        <p className="mt-4 font-code text-[11px] tracking-[0.12em] text-rose-300 leading-relaxed">
          {prep.unavailable || "LIVE MICRO-EXECUTION UNAVAILABLE"}
        </p>
      )}
      <label className="mt-5 block font-code text-[9px] tracking-[0.25em] text-plimsoll/70">
        TYPE CONFIRM
        <input
          value={confirmText}
          onChange={(e) => onConfirmText(e.target.value)}
          className={`mt-2 w-full bg-plimsoll-black border border-plimsoll/40 px-3 py-2 font-code text-sm text-plimsoll ${focusGold}`}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || confirmText.trim() !== "CONFIRM" || !prep?.legal}
          onClick={onExecute}
          className={`tech-box-dark font-code text-[11px] tracking-[0.2em] ${focusGold} ${
            busy || confirmText.trim() !== "CONFIRM" || !prep?.legal ? "opacity-40" : ""
          }`}
        >
          {busy ? "EXECUTING…" : "CONFIRM EXECUTION"}
        </button>
        <button type="button" onClick={onCancel} className={`tech-box-dark font-code text-[11px] tracking-[0.2em] ${focusGold}`}>
          CANCEL
        </button>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-plimsoll/10 py-1">
      <dt className="text-white/40">{k}</dt>
      <dd className="text-plimsoll break-all text-right">{v}</dd>
    </div>
  );
}
