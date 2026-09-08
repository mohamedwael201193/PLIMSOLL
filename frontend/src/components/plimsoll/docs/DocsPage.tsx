"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Ban, Lock, Hand, RefreshCw, FileJson, EyeOff, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AGENT_LOOP } from "@/lib/agents";
import { Corners, reveal, focusGold, fmtUsdFull } from "../landing/shared";
import { DEFAULT_CONSTRAINTS, type CapacityResult } from "@/lib/capacity";
import { intentText, postIntent } from "@/lib/oregon";

interface Props {
  glitch: boolean;
}

const DOCS_URL = "https://developers.binance.com/en/docs/agent-native/mcp-server";
const MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";

const SECTIONS = [
  { id: "overview", num: "01", label: "OVERVIEW" },
  { id: "how-capacity-works", num: "02", label: "HOW CAPACITY WORKS" },
  { id: "user-constitution", num: "03", label: "USER CONSTITUTION" },
  { id: "agent-loop", num: "04", label: "THE AGENT LOOP" },
  { id: "agent-os", num: "05", label: "BINANCE AGENT OS" },
  { id: "mcp", num: "06", label: "MCP" },
  { id: "execution", num: "07", label: "EXECUTION" },
  { id: "read-back", num: "08", label: "READ-BACK" },
  { id: "re-solve", num: "09", label: "CONTINUOUS RE-SOLVE" },
  { id: "safety", num: "10", label: "SAFETY" },
  { id: "api", num: "11", label: "API" },
  { id: "examples", num: "12", label: "EXAMPLES" },
  { id: "faq", num: "13", label: "FAQ" },
] as const;

const LOOP_LINES: string[] = [
  "Pull the live book, the 24h quote volume and the exchange filters into one snapshot. Stale feeds refuse to pass.",
  "Walk the visible bid book. Compute cost capacity, time capacity and the legal size — then draw the line.",
  "Shape the action that fits inside the binding constraint. Nothing is planned outside the line.",
  "Choose among accept, reduce, stage, wait or refuse. The desk recommends; the operator decides.",
  "Put the action in front of the operator. This is the human gate — no approval, no order.",
  "Execute once, through Binance Agent OS, only after every write condition has been checked.",
  "Read the order back from the exchange. Reconcile balances. Partial fills are not success.",
  "Re-solve the held position against the next snapshot. The line moved — check it again.",
];

const SAFETY_ITEMS = [
  { icon: Ban, label: "NO WITHDRAWALS", line: "The write path cannot touch withdrawals. It does not exist in the toolset PLIMSOLL binds." },
  { icon: Lock, label: "NO TRANSFERS", line: "Funds stay on the exchange account. Nothing moves between accounts, ever." },
  { icon: Hand, label: "NO SILENT SELLS", line: "Over capacity proposes a trim. PLIMSOLL never acts on its own — the decision stays yours." },
  { icon: RefreshCw, label: "STALE SNAPSHOTS REFUSE ACTION", line: "If the feed is not fresh, the loop halts. No action is built on an old book." },
  { icon: FileJson, label: "JSON LOGS", line: "Every decision is logged as structured, reviewable JSON — evidence, not vibes." },
  { icon: EyeOff, label: "SECRETS NEVER LOGGED", line: "Keys and credentials never appear in any log line or browser payload." },
];

const FAQ_ITEMS = [
  {
    q: "WHAT DOES PLIMSOLL DO?",
    a: "PLIMSOLL estimates how much exposure the market can support under your stated exit constraints — and keeps re-solving as conditions change.",
  },
  {
    q: "IS THIS A GUARANTEED EXIT?",
    a: "No. It is an estimated exit capacity under your stated constraints, computed against the visible book at snapshot time. The line moves when the market moves.",
  },
  {
    q: "WHAT IS LIVE VERSUS REPLAY?",
    a: "LIVE means the backend captured a current official market snapshot. REPLAY means a stored fixture used in tests. PAPER and SIMULATED are never presented as live. If the feed is unavailable the product says DATA UNAVAILABLE — it does not invent numbers.",
  },
  {
    q: "WHAT IS BINANCE AGENT OS?",
    a: "The official Binance surface for agentic accounts and MCP. PLIMSOLL uses it for account access, approved execution, and order read-back. Public capacity still uses official Spot REST. PLIMSOLL is not a Binance product and is not endorsed by Binance.",
  },
  {
    q: "WHAT IS MCP?",
    a: "Model Context Protocol. The official Agent OS endpoint is https://agent.binance.com/mcp/agentic. Tools are discovered at runtime. Reads (account, balance, get order) are separate from writes (new order after confirmation).",
  },
  {
    q: "WHAT IS THE AGENTIC ACCOUNT?",
    a: "The dedicated Agent OS virtual sub-account created at MCP OAuth — not a Normal Sub. MCP getAccount does not label Agentic vs master; the operator must authorize the Agentic account. This CIMD web client is currently refused (3346001).",
  },
  {
    q: "HOW DOES APPROVAL WORK?",
    a: "After a live solve, the operator issues a snapshot-bound approval token. That token is not a financial write. It expires. Stale snapshots refuse action.",
  },
  {
    q: "HOW DOES EXECUTION WORK?",
    a: "A live order requires writes enabled, a fresh snapshot, a valid approval, typed CONFIRM, a runtime MCP bind, then order submission. Without confirmation there is no write.",
  },
  {
    q: "HOW DOES READ-BACK WORK?",
    a: "After a real write: get order, then get account/balance, then reconcile. Only after successful reconciliation may the UI say EXECUTED. Otherwise it says EXECUTION STATE UNKNOWN or RECONCILIATION REQUIRED.",
  },
  {
    q: "HOW DOES RE-SOLVING WORK?",
    a: "POST /v1/resolve re-inverts a held position against a new snapshot. If capacity falls below the position, the agent flags OVER CAPACITY and may propose TRIM. It never silently sells.",
  },
  {
    q: "WHAT ARE THE LIMITATIONS?",
    a: "Visible book only. 24h volume is an assumption. Icebergs, spoofing, and hidden liquidity are not modelled. Capacity is estimated, not guaranteed. Markets change. Execution needs explicit confirmation. Agent OS web authorization currently requires a Binance-supported Agent client.",
  },
  {
    q: "DOES PLIMSOLL TRADE FOR ME?",
    a: "Only after an explicit approval and a typed operator CONFIRM. Without writes enabled, a fresh snapshot and an unexpired token, nothing executes.",
  },
];

export default function DocsPage({ glitch }: Props) {
  const [active, setActive] = useState<string>("overview");

  // highlight the section currently in the reading window
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // anchor scroll without touching the hash router
  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main
      id="docs"
      className={`grid-dark-dense noise relative overflow-hidden pt-28 sm:pt-32 pb-16 ${glitch ? "glitch-on" : ""}`}
      aria-label="Plimsoll documentation"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        {/* header */}
        <header>
          <span className="font-code text-[10px] tracking-[0.3em] text-plimsoll/60">
            [ OPERATOR_REFERENCE — READ BEFORE SIZING ]
          </span>
          <h1 className="font-display section-word mt-4 text-white">
            PLIMSOLL <span className="text-outline-gold">DOCS</span>
          </h1>
          <motion.p {...reveal(0.1)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/60 max-w-xl">
            PLIMSOLL estimates how much exposure the market can support under your stated exit constraints — and keeps re-solving as conditions change.
          </motion.p>
        </header>

        <div className="mt-12 sm:mt-16 grid lg:grid-cols-[240px_minmax(0,1fr)] gap-10 xl:gap-14">
          {/* ── sidebar nav (desktop sticky) ── */}
          <nav
            aria-label="Docs sections"
            className="hidden lg:block self-start sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto scroll-thin pr-2"
          >
            <div className="font-code text-[9px] tracking-[0.3em] text-plimsoll/60 mb-4">[ ON_THIS_PAGE ]</div>
            <ul className="space-y-1">
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`w-full text-left font-code text-[10px] tracking-[0.15em] py-1.5 pl-3 border-l-2 transition-colors ${
                        isActive
                          ? "border-plimsoll text-plimsoll"
                          : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/30"
                      } ${focusGold}`}
                    >
                      <span className="text-plimsoll/40 mr-2">{s.num}</span>
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 font-code text-[8px] tracking-[0.2em] text-white/30 leading-relaxed">
              ALL PAYLOADS LABELLED LIVE / REPLAY / PAPER / SIMULATED
            </div>
          </nav>

          {/* ── mobile nav strip ── */}
          <nav
            aria-label="Docs sections"
            className="lg:hidden flex gap-1 overflow-x-auto scroll-thin pb-2 -mx-4 px-4"
          >
            {SECTIONS.map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(s.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`shrink-0 font-code text-[9px] tracking-[0.15em] px-2.5 py-1.5 border transition-colors ${
                    isActive
                      ? "border-plimsoll text-plimsoll"
                      : "border-white/15 text-white/40"
                  } ${focusGold}`}
                >
                  {s.num} {s.label}
                </button>
              );
            })}
          </nav>

          {/* ── content ── */}
          <div className="max-w-3xl min-w-0">
            {/* 01 — OVERVIEW */}
            <section id="overview" className="scroll-mt-32">
              <SectionHead num="01" title="OVERVIEW" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                PLIMSOLL is an exit-capacity instrument. It estimates how much of an asset you can
                hold while still being able to exit within the cost and time constraints you declare
                — and it keeps re-solving that estimate as the market changes.
              </p>
              <div className="mt-6 border-l-2 border-plimsoll pl-4 font-grotesk text-[14px] sm:text-[15px] text-plimsoll">
                Estimated exit capacity under your stated constraints.
              </div>
              <div className="mt-8 grid sm:grid-cols-2 gap-6">
                <div className="border border-plimsoll/20 p-4 sm:p-5">
                  <div className="font-code text-[9px] tracking-[0.25em] text-plimsoll/70 mb-3">WHAT IT IS</div>
                  <ul className="space-y-2 font-grotesk text-[13px] text-white/70">
                    <li>— An estimate, computed from the visible book at snapshot time.</li>
                    <li>— A function of constraints you declare before the math runs.</li>
                    <li>— Re-solved continuously as the line moves.</li>
                  </ul>
                </div>
                <div className="border border-white/10 p-4 sm:p-5">
                  <div className="font-code text-[9px] tracking-[0.25em] text-rose-300/70 mb-3">WHAT IT IS NOT</div>
                  <ul className="space-y-2 font-grotesk text-[13px] text-white/55">
                    <li>— Never a maximum safe size.</li>
                    <li>— Never a guaranteed exit.</li>
                    <li>— Never a claim of guaranteed liquidity.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 02 — HOW CAPACITY WORKS */}
            <section id="how-capacity-works" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="02" title="HOW CAPACITY WORKS" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                Capacity is the minimum of several walls. Each wall is measured, not guessed.
              </p>

              <SubLabel className="mt-7">COST_CAPACITY</SubLabel>
              <p className="font-grotesk text-[13px] leading-relaxed text-white/70">
                The cartographer walks the visible bid book level by level, accumulating notional
                while accumulating impact plus taker fees. Cost capacity is the deepest point at
                which the all-in taker cost of exiting still fits inside{" "}
                <code className="font-code text-[11px] text-plimsoll">max_exit_cost_bps</code>.
              </p>

              <SubLabel className="mt-6">TIME_CAPACITY</SubLabel>
              <p className="font-grotesk text-[13px] leading-relaxed text-white/70">
                Exit is also bounded by how much of the market you are allowed to be. Time capacity
                is participation × 24h quote volume × horizon — the notional that can realistically
                trade through inside your window.
              </p>

              <SubLabel className="mt-6">BOOK_FRACTION</SubLabel>
              <p className="font-grotesk text-[13px] leading-relaxed text-white/70">
                Only a declared fraction of the visible bid book is trusted, because the book can
                fade before you get there. This is the visibility haircut.
              </p>

              <SubLabel className="mt-6">EXCHANGE_FILTERS</SubLabel>
              <p className="font-grotesk text-[13px] leading-relaxed text-white/70">
                The estimate is then legalized against the official LOT_SIZE, MARKET_LOT_SIZE and
                NOTIONAL filters. A size the exchange will reject is not capacity.
              </p>

              <CodeBlock title="THE SOLVE">
{`cost_capacity  = deepest notional on the visible bid book
                 where all-in taker cost (impact + fees)
                 <= max_exit_cost_bps
time_capacity  = participation x 24h_quote_volume x horizon
exit_capacity  = min(cost_capacity, time_capacity,
                     book_fraction, legal)
binding        = the constraint that produced the minimum`}
              </CodeBlock>

              <p className="mt-5 font-grotesk text-[13px] leading-relaxed text-white/75">
                The binding constraint is shown on every result — COST, TIME, BOOK or FILTERS.
                Capacity is only as honest as its tightest wall.
              </p>
            </section>

            {/* 03 — USER CONSTITUTION */}
            <section id="user-constitution" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="03" title="USER CONSTITUTION" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                The constitution is the constraint set you declare before any math runs. PLIMSOLL
                never chooses it for you and never edits it behind your back.
              </p>
              <div className="mt-6 border border-plimsoll/25 divide-y divide-plimsoll/10">
                {[
                  { k: "MAX_EXIT_COST", v: "50 BPS", d: "Maximum all-in cost you are willing to tolerate when exiting." },
                  { k: "EXIT_HORIZON", v: "1 DAY", d: "How many days you allow for that exit." },
                  { k: "PARTICIPATION", v: "10 % ADV", d: "How much of recent market volume you are willing to represent." },
                  { k: "BOOK_FRACTION", v: "50 %", d: "How much of currently visible bids you are willing to rely on." },
                ].map((row) => (
                  <div key={row.k} className="grid sm:grid-cols-[180px_110px_minmax(0,1fr)] gap-1 sm:gap-4 p-4">
                    <span className="font-code text-[10px] tracking-[0.2em] text-plimsoll">{row.k}</span>
                    <span className="font-code text-[10px] tracking-[0.15em] text-white/85 tabular-nums">{row.v}</span>
                    <span className="font-grotesk text-[12px] text-white/55">{row.d}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 font-grotesk text-[13px] leading-relaxed text-white/70">
                The defaults are conservative, not magic — 10% ADV participation is a common
                institutional assumption. The constitution is a user-controlled assumption, not a
                hidden constant.
              </p>
              <a
                href="#/settings"
                className={`mt-5 inline-flex items-center gap-2 font-code text-[10px] tracking-[0.2em] border border-plimsoll/40 text-plimsoll px-3 py-2 hover:bg-plimsoll/10 transition-colors ${focusGold}`}
              >
                EDIT YOUR CONSTITUTION
                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </a>
            </section>

            {/* 04 — THE AGENT LOOP */}
            <section id="agent-loop" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="04" title="THE AGENT LOOP" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                One spine, eight steps, every pass. OBSERVE → UNDERSTAND → PLAN → DECIDE → ASK →
                ACT → VERIFY → ADAPT.
              </p>
              <ol className="mt-6 border-l border-plimsoll/20">
                {AGENT_LOOP.map((step, i) => (
                  <li key={step} className="relative pl-5 py-3">
                    <span
                      aria-hidden
                      className={`absolute left-[-3.5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 ${
                        i === 5 ? "bg-plimsoll" : "bg-white/25"
                      }`}
                    />
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-code text-[10px] tracking-[0.2em] text-plimsoll/70">
                        {String(i + 1).padStart(2, "0")} {step}
                      </span>
                      <span className="font-grotesk text-[12px] sm:text-[13px] text-white/65">
                        {LOOP_LINES[i]}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 font-code text-[9px] tracking-[0.2em] text-white/35">
                THE FIVE CREW ENTITIES SIT AT 01, 02, 06, 07 AND 08 — SEE THE CREW PAGE.
              </p>
            </section>

            {/* 05 — BINANCE AGENT OS */}
            <section id="agent-os" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="05" title="BINANCE AGENT OS" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                PLIMSOLL is built with Binance Agent OS. Public estimated exit capacity uses official
                Spot market data. Account access, approved execution, and order read-back use the
                official Agent OS MCP — bounded permissions, observable steps, no endorsement claimed.
              </p>
              <div className="mt-6 border border-plimsoll/25 divide-y divide-plimsoll/10">
                <div className="p-4">
                  <div className="font-code text-[10px] tracking-[0.2em] text-plimsoll">MCP_ENDPOINT</div>
                  <code className="mt-1.5 block font-code text-[11px] text-plimsoll/90 break-all">
                    {MCP_ENDPOINT}
                  </code>
                </div>
                {[
                  {
                    k: "AGENTIC SUB-ACCOUNT",
                    d: "A dedicated virtual sub-account — not a Normal Sub — with bounded, spot-only permissions.",
                  },
                  {
                    k: "HUMAN APPROVAL",
                    d: "Nothing executes without your explicit, unexpired approval token and typed CONFIRM.",
                  },
                  {
                    k: "SPOT EXECUTION",
                    d: "Spot markets only. No leverage, no derivatives, no invention.",
                  },
                ].map((row) => (
                  <div key={row.k} className="p-4">
                    <div className="font-code text-[10px] tracking-[0.2em] text-plimsoll">{row.k}</div>
                    <p className="mt-1.5 font-grotesk text-[12px] sm:text-[13px] text-white/60 leading-relaxed">
                      {row.d}
                    </p>
                  </div>
                ))}
              </div>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 tech-box-dark inline-flex items-center gap-3 font-code text-[10px] sm:text-[11px] tracking-[0.15em] ${focusGold}`}
                aria-label="Binance Agent OS documentation, opens in a new tab"
              >
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                <span>OFFICIAL AGENT OS DOCUMENTS</span>
              </a>
              <p className="mt-4 font-code text-[8px] sm:text-[9px] tracking-[0.18em] text-white/35 leading-relaxed max-w-md">
                PLIMSOLL IS BUILT WITH BINANCE AGENT OS. IT IS NOT A BINANCE PRODUCT AND IS NOT
                ENDORSED BY BINANCE.
              </p>
            </section>

            {/* 06 — MCP */}
            <section id="mcp" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="06" title="MCP" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                PLIMSOLL talks to the exchange through the Model Context Protocol. Tools are
                discovered at runtime, reads and writes are separated, and the write path is gated
                behind approval. One connection, seconds to set up.
              </p>
              <a
                href="#/docs/mcp"
                className={`mt-5 inline-flex items-center gap-2 font-code text-[10px] tracking-[0.2em] border border-plimsoll/40 text-plimsoll px-3 py-2 hover:bg-plimsoll/10 transition-colors ${focusGold}`}
              >
                SEE MCP GUIDE
                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </a>
            </section>

            {/* 07 — EXECUTION */}
            <section id="execution" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="07" title="EXECUTION" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                A live write requires all five, every time:
              </p>
              <ol className="mt-6 space-y-3">
                {[
                  { k: "WRITES_ENABLED", d: "The operator has enabled writes on the backend." },
                  { k: "FRESH SNAPSHOT HASH", d: "The capacity solve the order is based on is current, not stale." },
                  { k: "UNEXPIRED APPROVAL TOKEN", d: "Approval was given explicitly and has not aged out." },
                  { k: "OPERATOR CONFIRM", d: "A typed confirmation from a human, not an implicit default." },
                  { k: "RUNTIME MCP BIND", d: "The MCP connection is live and tools have been discovered." },
                ].map((gate, i) => (
                  <li key={gate.k} className="flex gap-4 items-start border border-plimsoll/20 p-4">
                    <span className="font-code text-[10px] tracking-[0.2em] text-plimsoll/60 shrink-0 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="font-code text-[10px] sm:text-[11px] tracking-[0.2em] text-plimsoll">
                        {gate.k}
                      </div>
                      <p className="mt-1 font-grotesk text-[12px] sm:text-[13px] text-white/60 leading-relaxed">
                        {gate.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 border-l-2 border-rose-400/70 pl-4 font-grotesk text-[13px] leading-relaxed text-rose-200/80">
                POST /v1/execute is not authorization. The endpoint is the last mile, not the gate —
                the gates are checked before the request is ever built.
              </div>
            </section>

            {/* 08 — READ-BACK */}
            <section id="read-back" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="08" title="READ-BACK" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                Every order is read back from the exchange — status, executed quantity, average
                price — and every balance is reconciled after the fact.
              </p>
              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                {[
                  { k: "READ", d: "The order is read back from the exchange, not assumed from the request." },
                  { k: "RECONCILE", d: "Account balances are checked against the pre-trade snapshot." },
                  { k: "REMAINING", d: "Leftover size needs a new approval before anything further moves." },
                ].map((b) => (
                  <div key={b.k} className="border border-plimsoll/20 p-4">
                    <div className="font-code text-[10px] tracking-[0.2em] text-plimsoll">{b.k}</div>
                    <p className="mt-1.5 font-grotesk text-[12px] text-white/60 leading-relaxed">{b.d}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 font-grotesk text-[13px] leading-relaxed text-white/70">
                Partial fills are not success. The read-back is what turns an intention into
                evidence — it is the difference between “sent” and “done”.
              </p>
            </section>

            {/* 09 — CONTINUOUS RE-SOLVE */}
            <section id="re-solve" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="09" title="CONTINUOUS RE-SOLVE" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                Capacity is not a number you get once. The watcher re-solves your held position
                against every new snapshot — and when the market thins, the line moves down.
              </p>

              <DocsLiveSolve />

              <p className="mt-5 font-grotesk text-[13px] leading-relaxed text-white/70">
                A live series accumulates on the desk from Oregon snapshots. This page does not invent a
                ten-minute walkthrough. When asked notional sits above capacity, PLIMSOLL flags OVER CAPACITY
                and proposes a trim. It never silently sells.
              </p>
              <p className="mt-3 font-grotesk text-[13px] leading-relaxed text-white/70">
                Propose, never sell. The trim decision — like every write — waits at ASK.
              </p>
            </section>

            {/* 10 — SAFETY */}
            <section id="safety" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="10" title="SAFETY" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                Autonomy without losing control. The loop can move fast because the blast radius is
                small by construction.
              </p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {SAFETY_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex gap-4 border border-plimsoll/20 p-4 hover:border-plimsoll/40 transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-plimsoll shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0">
                      <div className="font-code text-[10px] tracking-[0.18em] text-plimsoll">{item.label}</div>
                      <p className="mt-1.5 font-grotesk text-[12px] text-white/60 leading-relaxed">{item.line}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 11 — API */}
            <section id="api" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="11" title="API" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                The request carries intent, symbol and your constraints. The response carries the
                capacity, the binding constraint, the recommendation and the snapshot it was
                computed from.
              </p>

              <CodeBlock title="REQUEST — ESTIMATE CAPACITY">
{`POST /v1/intent

{
  "text":   "I want $10000 of ARK and need to exit within one day.",
  "symbol": "ARKUSDT",
  "constitution": {
    "max_exit_cost_bps": "50",
    "max_exit_horizon_days": "1",
    "max_participation": "0.10",
    "max_fraction_of_visible_book": "0.5"
  }
}`}
              </CodeBlock>

              <CodeBlock title="RESPONSE SHAPE — NUMBERS COME FROM OREGON, NEVER HARDCODED">
{`200 OK

{
  "classification": "LIVE",
  "snapshot_hash":  "<hash>",
  "decision": {
    "action": "SIZE_DOWN | FILL_AS_ASKED | …",
    "capacity": {
      "estimated_exit_capacity_notional": "<from live book>",
      "cost_capacity_notional": "<from live book>",
      "time_capacity_notional": "<from live book>",
      "binding": "COST | TIME | BOOK_FRACTION | FILTER"
    }
  }
}`}
              </CodeBlock>

              <SubLabel className="mt-8">APPROVAL → EXECUTION → VERIFICATION</SubLabel>
              <div className="mt-3 flex flex-wrap items-stretch gap-y-3">
                {[
                  { step: "APPROVAL", d: "Operator approves the proposed action; a token is issued with an expiry." },
                  { step: "EXECUTION", d: "POST /v1/execute carries the token; gates are re-checked server-side." },
                  { step: "VERIFICATION", d: "Order read-back, balance reconciliation, result recorded." },
                ].map((f, i) => (
                  <div key={f.step} className="flex items-stretch">
                    <div className="max-w-[240px] border border-plimsoll/30 p-4">
                      <div className="font-code text-[10px] tracking-[0.2em] text-plimsoll">{f.step}</div>
                      <p className="mt-1.5 font-grotesk text-[11px] text-white/55 leading-relaxed">{f.d}</p>
                    </div>
                    {i < 2 && (
                      <span aria-hidden className="flex items-center px-1 sm:px-2">
                        <span className="h-px w-3 sm:w-5 bg-plimsoll/50" />
                        <span className="font-code text-[9px] text-plimsoll">▸</span>
                        <span className="h-px w-3 sm:w-5 bg-plimsoll/50" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 12 — EXAMPLES */}
            <section id="examples" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="12" title="EXAMPLES" />
              <p className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/75">
                Ask for $10,000 of ARK on a one-day exit. Numbers below come from the live Oregon
                backend — never hardcoded.
              </p>

              <DocsLiveWalkthrough />

              <SubLabel className="mt-8">THE DECISION STAYS YOURS</SubLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {["ACCEPT", "REDUCE", "STAGE", "WAIT", "REFUSE"].map((d) => (
                  <span
                    key={d}
                    className="font-code text-[9px] sm:text-[10px] tracking-[0.2em] border border-plimsoll/40 text-plimsoll/80 px-3 py-1.5"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="mt-4 font-grotesk text-[13px] leading-relaxed text-white/70">
                Accept the smaller size, reduce the request, stage the exit across the horizon, wait
                for liquidity, or refuse. PLIMSOLL recommends from the live solve; the choice belongs
                to the operator.
              </p>
            </section>

            {/* 13 — FAQ */}
            <section id="faq" className="scroll-mt-32 pt-12 border-t border-plimsoll/10">
              <SectionHead num="13" title="FAQ" />
              <Accordion type="single" collapsible className="mt-6">
                {FAQ_ITEMS.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`} className="border-plimsoll/20">
                    <AccordionTrigger
                      className={`font-code text-[10px] sm:text-[11px] tracking-[0.15em] text-plimsoll hover:no-underline rounded-none py-4 ${focusGold}`}
                    >
                      <span className="text-plimsoll/40 mr-3">{String(i + 1).padStart(2, "0")}</span>
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="font-grotesk text-[13px] leading-relaxed text-white/70">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <p className="mt-8 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/30">
                STILL UNANSWERED? THE ANSWER IS PROBABLY “IT DEPENDS ON YOUR CONSTRAINTS.”
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── local presentational helpers ── */

function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="font-code text-[10px] tracking-[0.3em] text-plimsoll/50">[ {num} ]</span>
      <h2 className="font-display text-lg sm:text-2xl text-plimsoll">{title}</h2>
    </div>
  );
}

function SubLabel({ className = "", children }: { className?: string; children: string }) {
  return (
    <div className={`font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/60 ${className}`}>
      {children}
    </div>
  );
}

function CodeBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-5 border border-plimsoll/25 bg-plimsoll-black">
      <div className="border-b border-plimsoll/20 px-4 py-2 font-code text-[9px] tracking-[0.25em] text-plimsoll/50">
        {title}
      </div>
      <pre className="p-4 overflow-x-auto scroll-thin font-code text-[10px] sm:text-[11px] leading-relaxed text-plimsoll/90">
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

function DocsLiveWalkthrough() {
  const [mapped, setMapped] = useState<CapacityResult | null>(null);
  const [cls, setCls] = useState("UNKNOWN");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const c = { ...DEFAULT_CONSTRAINTS, targetNotional: 10000 };
    postIntent(intentText(c), c)
      .then((r) => {
        if (!alive) return;
        setCls(r.mapped.classification);
        setMapped(r.mapped);
      })
      .catch(() => {
        if (!alive) return;
        setCls("UNKNOWN");
        setError("DATA UNAVAILABLE");
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="corner-frame-4 text-plimsoll mt-6 max-w-xl border border-plimsoll/40 bg-plimsoll-black">
      <Corners tone="gold" />
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 font-code text-[9px] sm:text-[10px] tracking-[0.2em]">
          <span>REQUESTED — $10,000 · ARKUSDT</span>
          <span className="border border-plimsoll/30 text-plimsoll/70 px-1.5 py-0.5">{cls}</span>
        </div>
        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-3xl sm:text-4xl text-plimsoll tabular-nums">
            {mapped?.exitCapacity != null ? fmtUsdFull(mapped.exitCapacity) : error || "AWAITING LIVE"}
          </span>
          <span className="font-code text-[9px] sm:text-[10px] tracking-[0.2em] text-plimsoll/60">
            ESTIMATED EXIT CAPACITY
          </span>
        </div>
        {mapped?.exitCapacity != null && (
          <div className="mt-4 space-y-1.5 font-code text-[10px] tracking-[0.15em]">
            <div className="flex justify-between gap-4">
              <span className="text-white/45">COST CAPACITY</span>
              <span className="text-white/75 tabular-nums">{fmtUsdFull(mapped.costCapacity || 0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/45">TIME CAPACITY</span>
              <span className="text-white/75 tabular-nums">{fmtUsdFull(mapped.timeCapacity || 0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/45">BOOK CAPACITY</span>
              <span className="text-white/75 tabular-nums">{fmtUsdFull(mapped.bookCapacity || 0)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-plimsoll/15">
              <span className="text-plimsoll/70">BINDING</span>
              <span className="bg-plimsoll text-plimsoll-black px-1.5 py-0.5">{mapped.binding}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-plimsoll/70">DECISION</span>
              <span className="border border-plimsoll/50 text-plimsoll px-1.5 py-0.5">
                {String(mapped.recommendation || "").replace(/_/g, " ")}
              </span>
            </div>
          </div>
        )}
        <p className="mt-4 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-white/65">
          Source {mapped?.source || "Oregon"} · captured {mapped?.capturedAt || "—"}. Open the desk
          for $1,000 versus $10,000 on the same constraints.
        </p>
      </div>
    </div>
  );
}

function DocsLiveSolve() {
  const [capacity, setCapacity] = useState<number | null>(null);
  const [cls, setCls] = useState("UNKNOWN");
  const [clock, setClock] = useState("--:--");
  useEffect(() => {
    let alive = true;
    const c = { ...DEFAULT_CONSTRAINTS, targetNotional: 10000 };
    postIntent(intentText(c), c)
      .then((r) => {
        if (!alive) return;
        setCapacity(r.mapped.exitCapacity);
        setCls(r.mapped.classification);
        setClock(new Date(r.mapped.snapshot.ts).toISOString().slice(11, 16));
      })
      .catch(() => {
        if (alive) setCls("UNKNOWN");
      });
    return () => {
      alive = false;
    };
  }, []);
  const over = capacity != null && 10000 > capacity;
  return (
    <div className="mt-6 border border-plimsoll/25 p-4 sm:p-5">
      <div className="flex justify-between font-code text-[10px] tracking-[0.2em] text-plimsoll/70">
        <span>{clock} UTC · ASKED $10,000 ARKUSDT</span>
        <span>{cls}</span>
      </div>
      <div className="mt-2 font-display text-lg sm:text-xl text-white tabular-nums">
        {capacity != null ? fmtUsdFull(capacity) : "AWAITING LIVE"}
      </div>
      <div
        className={`mt-2 font-code text-[8px] tracking-[0.15em] px-1.5 py-0.5 inline-block border ${
          over ? "border-rose-400/60 text-rose-300" : "border-white/15 text-white/40"
        }`}
      >
        {over ? "OVER CAPACITY" : "WITHIN OR AWAITING"}
      </div>
    </div>
  );
}
