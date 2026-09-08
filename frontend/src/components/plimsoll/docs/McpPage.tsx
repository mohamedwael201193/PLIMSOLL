"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Eye,
  KeyRound,
  UserCog,
  EyeOff,
  Power,
  ShieldAlert,
  PenLine,
  Info,
} from "lucide-react";
import { Corners, reveal, focusGold } from "../landing/shared";
import { getMcpCapabilities } from "@/lib/oregon";

interface Props {
  glitch: boolean;
}

const MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";

const CLIENT_CONFIG = `{
  "mcpServers": {
    "binance-agent-os": {
      "url": "https://agent.binance.com/mcp/agentic"
    }
  }
}`;

/** Verified capability categories — names are discovered at runtime, never hardcoded. */
const READ_CAPS = [
  { label: "SPOT MARKET DATA", line: "Depth, tickers and 24h volumes for spot pairs." },
  { label: "ACCOUNT", line: "The agentic sub-account's own state." },
  { label: "BALANCES", line: "What the sub-account actually holds." },
  { label: "GET ORDER", line: "Order status read back from the exchange." },
  { label: "OPEN ORDERS", line: "Currently resting orders." },
];

const SECURITY_ROWS = [
  {
    icon: KeyRound,
    label: "OAUTH AT MCP BIND",
    line: "Binance currently requires a supported Agent client (Codex, Claude, Cursor, VS Code, ChatGPT) for Agent OS OAuth. This web CIMD client is refused (3346001). No static API key sits in the browser.",
  },
  {
    icon: UserCog,
    label: "AGENTIC VIRTUAL SUB-ACCOUNT",
    line: "The bind operates a dedicated agentic virtual sub-account — not a Normal Sub — with bounded, spot-only permissions.",
  },
  {
    icon: EyeOff,
    label: "SECRETS NEVER IN THE BROWSER",
    line: "Credentials live server-side on the desk. The browser never sees a secret, and neither do the logs.",
  },
  {
    icon: Power,
    label: "KILL SWITCH",
    line: "A kill switch can drop the write path instantly. Reads continue; writes stop.",
  },
  {
    icon: ShieldAlert,
    label: "FAIL-CLOSED BY DEFAULT",
    line: "Timeout, missing tool after discovery, or a schema change — every one of them halts the loop. Failure never defaults to action.",
  },
];

const TROUBLESHOOTING = [
  {
    symptom: "HTTP 418 FROM CLOUD EGRESS IPS",
    response:
      "Route market data through the official market-data host data-api.binance.vision, which is intended for public data access.",
  },
  {
    symptom: "MCP TIMEOUT",
    response: "Fail-closed. No action is taken — the loop halts and never assumes the call succeeded.",
  },
  {
    symptom: "TOOL NOT FOUND AFTER DISCOVERY",
    response: "Halt. The write path is never guessed by name.",
  },
  {
    symptom: "BINANCE 3346001 ON WEB AUTHORIZE",
    response:
      "This CIMD web client is not on Binance's Agent OS allowlist. Use a supported Agent client. Do not impersonate Codex, Claude, Cursor, VS Code, or ChatGPT.",
  },
];

type FlowType = "read" | "write" | "gate" | "neutral";

const FLOW: { step: string; type: FlowType }[] = [
  { step: "READ ACCOUNT", type: "read" },
  { step: "READ MARKET", type: "read" },
  { step: "CALCULATE CAPACITY", type: "neutral" },
  { step: "REQUEST APPROVAL", type: "gate" },
  { step: "EXECUTE", type: "write" },
  { step: "READ ORDER", type: "read" },
  { step: "VERIFY BALANCE", type: "read" },
  { step: "RE-SOLVE POSITION", type: "neutral" },
];

export default function McpPage({ glitch }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpointRef = useRef<HTMLDivElement>(null);
  const [caps, setCaps] = useState<{
    bound: boolean;
    classification: string;
    reason?: string;
    capabilities?: Record<string, string>;
    tool_count?: number;
    writes_enabled?: boolean;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    getMcpCapabilities()
      .then((c) => {
        if (alive) setCaps(c);
      })
      .catch(() => {
        if (alive) setCaps({ bound: false, classification: "UNKNOWN", reason: "Oregon MCP capabilities unreachable." });
      });
    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(MCP_ENDPOINT);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — select the endpoint text so it can be copied manually
      const el = endpointRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <main
      id="mcp"
      className={`grid-dark-dense noise relative overflow-hidden pt-28 sm:pt-32 pb-16 ${glitch ? "glitch-on" : ""}`}
      aria-label="MCP — Model Context Protocol guide"
    >
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-8">
        {/* header */}
        <div className="flex justify-between items-center font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/60">
          <span>MCP_QUICK_CONNECT</span>
          <span className="hidden sm:inline">RUNTIME_TOOL_DISCOVERY</span>
          <span>READ ≠ WRITE</span>
        </div>

        <header className="mt-4">
          <span className="font-code text-[10px] tracking-[0.3em] text-plimsoll/60">
            [ CONNECT_IN_SECONDS ]
          </span>
          <h1 className="font-display section-word mt-4 text-white">
            MCP — <span className="text-outline-gold">MODEL CONTEXT PROTOCOL</span>
          </h1>
          <motion.p {...reveal(0.1)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/60 max-w-xl">
            PLIMSOLL uses Binance Agent OS MCP for account access, approved execution, and order read-back. PLIMSOLL adds intent, constitution, estimated exit capacity, deterministic decision, approval, and continuous re-solve.
          </motion.p>
        </header>

        <motion.div {...reveal(0.05)} className="mt-10 border border-plimsoll/25 bg-plimsoll-black/60 p-5 sm:p-6">
          <div className="flex flex-wrap justify-between gap-2 font-code text-[10px] tracking-[0.25em] text-plimsoll">
            <span>PLIMSOLL + BINANCE AGENT OS</span>
            <span>{caps ? (caps.bound ? `BOUND · ${caps.tool_count ?? 0} TOOLS · ${caps.classification}` : "NOT BOUND") : "DISCOVERING…"}</span>
          </div>
          <p className="mt-3 font-grotesk text-[13px] text-white/65 leading-relaxed">
            PLIMSOLL adds intent, constitution, estimated exit capacity from official public Spot
            data, deterministic decision, approval, and continuous re-solve. Binance Agent OS MCP
            provides account access, approved execution, and order read-back. Official MCP: {MCP_ENDPOINT}.
            This CIMD web client is refused as unsupported agent 3346001 — use a supported Agent client.
          </p>
          {caps?.reason && (
            <p className="mt-3 font-code text-[10px] tracking-[0.12em] text-rose-300">{caps.reason}</p>
          )}
          {caps?.capabilities && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/50 mb-2">READ</div>
                <ul className="space-y-2 font-code text-[10px] tracking-[0.12em]">
                  {Object.entries(caps.capabilities)
                    .filter(([k]) => !/NEW|WRITE|CANCEL/i.test(k))
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-3 border border-plimsoll/15 px-3 py-2">
                        <span className="text-white/45">{k}</span>
                        <span className="text-plimsoll break-all text-right">{v}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/50 mb-2">WRITE</div>
                <ul className="space-y-2 font-code text-[10px] tracking-[0.12em]">
                  {Object.entries(caps.capabilities)
                    .filter(([k]) => /NEW|WRITE|CANCEL/i.test(k))
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-3 border border-plimsoll/15 px-3 py-2">
                        <span className="text-white/45">{k}</span>
                        <span className="text-plimsoll break-all text-right">{v}</span>
                      </li>
                    ))}
                  {!Object.keys(caps.capabilities).some((k) => /NEW|WRITE|CANCEL/i.test(k)) && (
                    <li className="border border-plimsoll/15 px-3 py-2 text-white/40">UNBOUND — NO WRITE TOOLS</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── quick connect ── */}
        <motion.div {...reveal(0.05)} className="mt-12 corner-frame-4 text-plimsoll border border-plimsoll/40 bg-plimsoll-black p-5 sm:p-7">
          <Corners tone="gold" />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60">
              [ QUICK_CONNECT — OFFICIAL_ENDPOINT ]
            </span>
            <span className="font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/30">
              OAUTH AT BIND · NO STATIC KEYS
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div
              ref={endpointRef}
              className="min-w-0 flex-1 border border-plimsoll/40 bg-plimsoll-black px-4 py-4 font-code text-[12px] sm:text-[15px] text-plimsoll break-all select-all"
            >
              {MCP_ENDPOINT}
            </div>
            <button
              type="button"
              onClick={copyEndpoint}
              aria-label={copied ? "Endpoint copied" : "Copy MCP endpoint"}
              className={`shrink-0 inline-flex items-center justify-center gap-2 border px-4 py-3 font-code text-[10px] sm:text-[11px] tracking-[0.2em] transition-colors ${
                copied
                  ? "border-plimsoll bg-plimsoll/15 text-plimsoll"
                  : "border-plimsoll/40 text-plimsoll/80 hover:bg-plimsoll/10 hover:border-plimsoll"
              } ${focusGold}`}
            >
              {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>

          <div className="mt-6 font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60">
            [ CLIENT_CONFIGURATION — ADD_TO_YOUR_MCP_CLIENT ]
          </div>
          <pre className="mt-3 border border-plimsoll/25 bg-plimsoll-black p-4 overflow-x-auto scroll-thin font-code text-[10px] sm:text-[12px] leading-relaxed text-plimsoll/90">
            <code>{CLIENT_CONFIG}</code>
          </pre>
          <p className="mt-3 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/35">
            ADD THIS URL IN A SUPPORTED AGENT CLIENT. NO API KEYS IN THE BROWSER.
          </p>
        </motion.div>

        {/* ── what MCP does: read vs write ── */}
        <section aria-label="Read and write separation" className="mt-16">
          <div className="font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60 mb-5">
            [ WHAT_MCP_DOES — READ VS WRITE SEPARATION ]
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <motion.div {...reveal(0.05)} className="border border-plimsoll/25 bg-plimsoll-black/60">
              <div className="flex items-center gap-3 border-b border-plimsoll/15 p-4">
                <Eye className="w-4 h-4 text-plimsoll/70" strokeWidth={1.5} aria-hidden />
                <span className="font-code text-[10px] sm:text-[11px] tracking-[0.25em] text-plimsoll/70">
                  [ READ — OBSERVE ONLY ]
                </span>
              </div>
              <ul className="divide-y divide-plimsoll/10">
                {READ_CAPS.map((cap) => (
                  <li key={cap.label} className="p-4 hover:bg-plimsoll/[0.04] transition-colors">
                    <div className="font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll/80">
                      {cap.label}
                    </div>
                    <p className="mt-1 font-grotesk text-[12px] text-white/55 leading-relaxed">{cap.line}</p>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...reveal(0.12)} className="border border-plimsoll/40 bg-plimsoll/5">
              <div className="flex items-center gap-3 border-b border-plimsoll/25 p-4">
                <PenLine className="w-4 h-4 text-plimsoll" strokeWidth={1.5} aria-hidden />
                <span className="font-code text-[10px] sm:text-[11px] tracking-[0.25em] text-plimsoll">
                  [ WRITE — GATED ]
                </span>
              </div>
              <div className="p-4">
                <div className="font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll">
                  NEW ORDER
                </div>
                <p className="mt-1 font-grotesk text-[12px] sm:text-[13px] text-white/60 leading-relaxed">
                  The only write capability PLIMSOLL binds. A new order is refused unless writes
                  are enabled, the approval token is unexpired and the operator has typed CONFIRM.
                </p>
                <div className="mt-4 font-code text-[8px] sm:text-[9px] tracking-[0.2em] leading-relaxed text-plimsoll/60 space-y-1">
                  <div>▸ GATE 01 — WRITES_ENABLED ON THE BACKEND</div>
                  <div>▸ GATE 02 — UNEXPIRED APPROVAL TOKEN</div>
                  <div>▸ GATE 03 — OPERATOR CONFIRM</div>
                </div>
                <p className="mt-4 font-grotesk text-[12px] text-white/45 leading-relaxed">
                  No withdrawals. No transfers. Nothing outside spot. Everything else PLIMSOLL does
                  is a read.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── conceptual flows ── */}
        <section aria-label="Conceptual flows" className="mt-16">
          <div className="font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60 mb-5">
            [ CONCEPTUAL_FLOWS — ONE PASS, EIGHT STEPS ]
          </div>
          <motion.div {...reveal(0.05)} className="flex flex-wrap items-center gap-y-3">
            {FLOW.map((f, i) => (
              <div key={f.step} className="flex items-center">
                <div
                  className={`flex flex-col items-start px-3 py-2 border ${
                    f.type === "write"
                      ? "bg-plimsoll text-plimsoll-black border-plimsoll"
                      : f.type === "read"
                        ? "border-plimsoll/30 text-plimsoll/60"
                        : f.type === "gate"
                          ? "border-dashed border-plimsoll/50 text-plimsoll/80"
                          : "border-white/15 text-white/45"
                  }`}
                >
                  <span className="font-code text-[9px] sm:text-[11px] tracking-[0.18em]">{f.step}</span>
                  {f.type === "write" && (
                    <span className="mt-1 font-code text-[7px] sm:text-[8px] tracking-[0.15em] border border-plimsoll-black/40 px-1 py-0.5">
                      REQUIRES APPROVAL
                    </span>
                  )}
                </div>
                {i < FLOW.length - 1 && (
                  <span aria-hidden className="flex items-center px-1">
                    <span className="font-code text-[9px] text-plimsoll/50">▸</span>
                  </span>
                )}
              </div>
            ))}
          </motion.div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/35">
            <span>READ — DIMMED GOLD</span>
            <span>EXECUTE — SOLID GOLD · GATED</span>
            <span>NEUTRAL — DESK STEPS</span>
          </div>
        </section>

        {/* ── authentication & security ── */}
        <section aria-label="Authentication and security" className="mt-16">
          <div className="font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60 mb-5">
            [ AUTHENTICATION_&_SECURITY ]
          </div>
          <motion.ul {...reveal(0.05)} className="border border-plimsoll/20 bg-plimsoll-black/50 divide-y divide-plimsoll/10">
            {SECURITY_ROWS.map((row) => (
              <li key={row.label} className="flex gap-4 p-4 sm:p-5 hover:bg-plimsoll/[0.04] transition-colors">
                <row.icon className="w-5 h-5 text-plimsoll shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <div className="font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll">{row.label}</div>
                  <p className="mt-1 font-grotesk text-[12px] sm:text-[13px] text-white/55 leading-relaxed">{row.line}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        </section>

        {/* ── troubleshooting ── */}
        <section aria-label="Troubleshooting" className="mt-16">
          <div className="font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60 mb-5">
            [ TROUBLESHOOTING — FAIL_CLOSED ]
          </div>
          <motion.div {...reveal(0.05)} className="border border-plimsoll/20 divide-y divide-plimsoll/10 overflow-x-auto scroll-thin">
            <div className="grid sm:grid-cols-[minmax(220px,1fr)_minmax(0,1.4fr)] gap-1 sm:gap-4 p-4 border-b border-plimsoll/10 bg-plimsoll/5 min-w-max sm:min-w-0">
              <span className="font-code text-[9px] tracking-[0.25em] text-plimsoll/50">SYMPTOM</span>
              <span className="font-code text-[9px] tracking-[0.25em] text-plimsoll/50 hidden sm:block">RESPONSE</span>
            </div>
            {TROUBLESHOOTING.map((row) => (
              <div
                key={row.symptom}
                className="grid sm:grid-cols-[minmax(220px,1fr)_minmax(0,1.4fr)] gap-1 sm:gap-4 p-4 min-w-max sm:min-w-0"
              >
                <span className="font-code text-[10px] sm:text-[11px] tracking-[0.15em] text-rose-300/80">
                  {row.symptom}
                </span>
                <span className="font-grotesk text-[12px] sm:text-[13px] text-white/60 leading-relaxed">
                  {row.response}
                </span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── runtime discovery note ── */}
        <motion.div {...reveal(0.05)} className="mt-16 flex gap-4 border-l-2 border-plimsoll/60 pl-4 max-w-2xl">
          <Info className="w-4 h-4 text-plimsoll shrink-0 mt-1" strokeWidth={1.5} aria-hidden />
          <p className="font-grotesk text-[12px] sm:text-[14px] leading-relaxed text-white/70">
            The Oregon backend performs runtime tool discovery — names are never hardcoded.
            Capability keys above are the live bind map from GET /v1/mcp/capabilities.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
