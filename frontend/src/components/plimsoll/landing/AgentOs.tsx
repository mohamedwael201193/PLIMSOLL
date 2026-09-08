"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Check, Copy, ExternalLink, FileSearch, Plug, ShieldCheck, UserCheck } from "lucide-react";
import { SectionLabel, reveal, focusGold } from "./shared";

interface Props {
  glitch: boolean;
}

const MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";
const DOCS_URL = "https://developers.binance.com/en/docs/agent-native/mcp-server";

const INTEGRATIONS = [
  {
    icon: Plug,
    label: "MCP",
    line: "Official Agent OS MCP for account, balances, approved orders, and order read-back. Public capacity uses Spot REST.",
  },
  {
    icon: UserCheck,
    label: "AGENTIC SUB-ACCOUNT",
    line: "A dedicated sub-account with bounded, spot-only permissions.",
  },
  {
    icon: ShieldCheck,
    label: "HUMAN APPROVAL",
    line: "Nothing executes without your explicit, unexpired confirmation token.",
  },
  {
    icon: ArrowLeftRight,
    label: "SPOT EXECUTION",
    line: "Spot markets only. No leverage, no derivatives, no invention.",
  },
  {
    icon: FileSearch,
    label: "ORDER READ-BACK",
    line: "Every order is read back from the exchange and reconciled after the fact.",
  },
];

const FLOW = [
  { step: "PLAN", loop: "03", highlighted: false },
  { step: "APPROVAL", loop: "05 · ASK", highlighted: true },
  { step: "EXECUTE", loop: "06 · ACT", highlighted: true },
  { step: "VERIFY", loop: "07", highlighted: true },
  { step: "ADAPT", loop: "08", highlighted: false },
];

export default function AgentOs({ glitch }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(MCP_ENDPOINT);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable in this context */
    }
  };

  return (
    <section
      className={`relative bg-plimsoll-deep noise overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="Built with Binance Agent OS"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="06" name="AGENT OS" />
        <h2 className="font-display section-word mt-4 text-white">
          BUILT WITH <span className="text-outline-gold">BINANCE AGENT OS</span>
        </h2>
        <motion.p {...reveal(0.1)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/60 max-w-xl">
          Public estimated exit capacity uses official Binance Spot market data. Account access,
          approved execution, and order read-back use Binance Agent OS MCP on the Agentic
          account — behind your approval. Not a Binance product. Not a Binance endorsement.
        </motion.p>

        <div className="mt-12 grid lg:grid-cols-2 gap-8 items-start">
          {/* left: endpoint + docs */}
          <div>
            <motion.div {...reveal()} className="border border-plimsoll/25 bg-plimsoll-black p-4 sm:p-5">
              <div className="font-code text-[9px] tracking-[0.25em] text-plimsoll/60">MCP_ENDPOINT</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <code className="font-code text-[11px] sm:text-[13px] text-plimsoll min-w-0 overflow-x-auto scroll-thin whitespace-nowrap py-1">
                  {MCP_ENDPOINT}
                </code>
                <button
                  type="button"
                  onClick={copyEndpoint}
                  aria-label={copied ? "Endpoint copied" : "Copy MCP endpoint"}
                  className={`shrink-0 inline-flex items-center gap-2 border px-3 py-2 font-code text-[9px] sm:text-[10px] tracking-[0.2em] transition-colors ${
                    copied
                      ? "border-plimsoll bg-plimsoll/15 text-plimsoll"
                      : "border-plimsoll/40 text-plimsoll/80 hover:bg-plimsoll/10 hover:border-plimsoll"
                  } ${focusGold}`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>
            </motion.div>

            <motion.a
              {...reveal(0.1)}
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`tech-box-dark mt-6 inline-flex items-center gap-3 font-code text-[11px] sm:text-xs tracking-[0.15em] ${focusGold}`}
              aria-label="Binance Agent OS documentation, opens in a new tab"
            >
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
              <span>OFFICIAL AGENT OS DOCUMENTS</span>
            </motion.a>

            <motion.p {...reveal(0.15)} className="mt-5 font-code text-[8px] sm:text-[9px] tracking-[0.18em] text-white/35 leading-relaxed max-w-sm">
              PLIMSOLL IS BUILT WITH BINANCE AGENT OS. IT IS NOT A BINANCE PRODUCT AND IS NOT
              ENDORSED BY BINANCE.
            </motion.p>
          </div>

          {/* right: integration list */}
          <motion.ul {...reveal(0.05)} className="border border-plimsoll/20 bg-plimsoll-black/50 divide-y divide-plimsoll/10">
            {INTEGRATIONS.map((item) => (
              <li key={item.label} className="flex gap-4 p-4 sm:p-5 hover:bg-plimsoll/[0.04] transition-colors">
                <item.icon className="w-5 h-5 text-plimsoll shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />
                <div className="min-w-0">
                  <div className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">{item.label}</div>
                  <p className="font-grotesk text-[12px] sm:text-[13px] text-white/55 mt-1 leading-relaxed">{item.line}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* the 5-step flow */}
        <motion.div {...reveal(0.1)} className="mt-14">
          <div className="font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/60 mb-4">
            THE WRITE PATH — FIVE STEPS, NO SHORTCUTS
          </div>
          <div className="flex flex-wrap items-stretch gap-y-3">
            {FLOW.map((f, i) => (
              <div key={f.step} className="flex items-stretch">
                <div
                  className={`flex flex-col items-center justify-center px-3 sm:px-5 py-3 border ${
                    f.highlighted
                      ? "border-plimsoll bg-plimsoll/10 text-plimsoll"
                      : "border-white/15 text-white/50"
                  }`}
                >
                  <span className="font-code text-[10px] sm:text-[11px] tracking-[0.2em]">{f.step}</span>
                  <span className="font-code text-[7px] sm:text-[8px] tracking-[0.15em] mt-1 opacity-60">
                    LOOP {f.loop}
                  </span>
                </div>
                {i < FLOW.length - 1 && (
                  <span aria-hidden className="flex items-center px-1 sm:px-2">
                    <span className="h-px w-3 sm:w-6 bg-plimsoll/50" />
                    <span className="font-code text-[9px] text-plimsoll">▸</span>
                    <span className="h-px w-3 sm:w-6 bg-plimsoll/50" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
