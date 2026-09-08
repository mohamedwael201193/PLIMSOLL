"use client";

import { motion } from "framer-motion";
import { SectionLabel, reveal } from "./shared";

interface Props {
  glitch: boolean;
}

const LINES: Array<{ prefix: string; body: string[]; accent?: boolean }> = [
  { prefix: "plimsoll@desk:~$ ", body: ["plimsoll capacity --symbol ARKUSDT"] },
  { prefix: "> ", body: ["POST /v1/intent ", "→ ", "LIVE | UNKNOWN"], accent: true },
  { prefix: "> ", body: ["depth: ", "1000 levels · walked deterministically"] },
  { prefix: "> ", body: ["filters: ", "live exchangeInfo LOT_SIZE / MARKET_LOT_SIZE / NOTIONAL"] },
  { prefix: "> ", body: ["payload labels: ", "LIVE | REPLAY | PAPER | TESTNET | SIMULATED"], accent: true },
  { prefix: "> ", body: ["partial fills: ", "NOT success"] },
  { prefix: "> ", body: ["stale snapshots: ", "REFUSE ACTION"], accent: true },
];

const STATS = [
  {
    title: "DETERMINISTIC MATH",
    line: "The same book and the same constraints always produce the same capacity. Filters and tradability come from live exchange metadata, not a hardcoded coin list.",
  },
  {
    title: "LABELLED PAYLOADS",
    line: "Every payload carries LIVE, REPLAY, PAPER, TESTNET or SIMULATED. Nothing pretends to be what it is not.",
  },
  {
    title: "POSITION VERSUS POLICY",
    line: "Governance agents decide whether an action is allowed. Execution agents carry out an approved order. PLIMSOLL continuously asks whether the position itself still fits the market under the user's terms.",
  },
];

export default function Technical({ glitch }: Props) {
  return (
    <section
      className={`relative bg-plimsoll-deep overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="Technical credibility"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="09" name="TECHNICAL" />
        <h2 className="font-display section-word mt-4 text-white">
          TECHNICAL <span className="text-outline-gold">CREDIBILITY</span>
        </h2>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-8 items-start">
          {/* terminal */}
          <motion.div {...reveal()} className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-black">
            <span aria-hidden className="cf cf-tl border-plimsoll" />
            <span aria-hidden className="cf cf-tr border-plimsoll" />
            <span aria-hidden className="cf cf-bl border-plimsoll" />
            <span aria-hidden className="cf cf-br border-plimsoll" />
            <div className="flex items-center gap-2 px-4 py-3 border-b border-plimsoll/15">
              <span className="w-2 h-2 rounded-full bg-plimsoll/80" aria-hidden />
              <span className="w-2 h-2 rounded-full bg-white/25" aria-hidden />
              <span className="w-2 h-2 rounded-full bg-white/25" aria-hidden />
              <span className="ml-2 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-plimsoll/50">
                plimsoll — capacity — 80×24
              </span>
            </div>
            <div className="p-4 sm:p-6 font-code text-[10px] sm:text-xs leading-7 tracking-[0.05em]">
              {LINES.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.14 }}
                  className="whitespace-nowrap overflow-x-auto scroll-thin"
                >
                  <span className="text-plimsoll/70">{l.prefix}</span>
                  <span className="text-white/60">
                    {l.body[0]}
                    {l.body.length > 1 && (
                      <>
                        <span className="text-plimsoll/60">{l.body[1]}</span>
                        <span className={l.accent ? "text-plimsoll" : ""}>{l.body[2]}</span>
                      </>
                    )}
                  </span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: 0.15 + LINES.length * 0.14 }}
                className="text-plimsoll/70"
              >
                plimsoll@desk:~$ <span className="caret" aria-hidden />
              </motion.div>
            </div>
          </motion.div>

          {/* stat blocks */}
          <div className="space-y-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.title}
                {...reveal(0.1 + i * 0.08)}
                className="border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/50 transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">{s.title}</span>
                  <span className="font-code text-[9px] text-plimsoll/30">T/{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="mt-2 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-white/55">{s.line}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
