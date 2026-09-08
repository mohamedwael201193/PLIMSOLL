"use client";

import { motion } from "framer-motion";
import { Camera, FileSearch, Power, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { SectionLabel, reveal } from "./shared";

interface Props {
  glitch: boolean;
}

const TILES = [
  {
    icon: ShieldCheck,
    title: "NO SILENT SELLS",
    line: "The agent never sells without you. It proposes a trim; the decision stays with the operator.",
  },
  {
    icon: Camera,
    title: "SNAPSHOT-BOUND APPROVAL",
    line: "An approval is valid for exactly one snapshot hash. If the book moves, the approval expires.",
  },
  {
    icon: RefreshCw,
    title: "FRESH DATA REQUIRED",
    line: "Stale snapshots refuse action. Capacity is only ever computed against the current book.",
  },
  {
    icon: UserCheck,
    title: "AGENTIC SUB-ACCOUNT",
    line: "Execution runs on a dedicated spot-only sub-account — bounded, observable, revocable.",
  },
  {
    icon: FileSearch,
    title: "READ-BACK VERIFICATION",
    line: "Every order is read back and reconciled. Partial fills are not success.",
  },
  {
    icon: Power,
    title: "KILL SWITCH",
    line: "One switch halts the loop — the watcher, the executor, all of it. Immediately.",
  },
];

export default function Safety({ glitch }: Props) {
  return (
    <section
      className={`relative grid-dark overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="Safety — autonomy without losing control"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="07" name="SAFETY" />
        <h2 className="font-display section-word mt-4 leading-[1.02]">
          <motion.span {...reveal()} className="block text-white">
            AUTONOMY
          </motion.span>
          <motion.span {...reveal(0.08)} className="block text-outline-gold">
            WITHOUT
          </motion.span>
          <motion.span {...reveal(0.16)} className="block text-white">
            LOSING CONTROL.
          </motion.span>
        </h2>
        <motion.p {...reveal(0.25)} className="mt-6 font-grotesk text-[13px] sm:text-[15px] text-white/60 max-w-lg">
          Autonomy is not trust. It is a set of hard constraints the agent cannot step around —
          six of them, enforced on every write.
        </motion.p>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map((t, i) => (
            <motion.div
              key={t.title}
              {...reveal(0.05 + i * 0.06)}
              className="group border border-plimsoll/20 bg-plimsoll-black/40 p-5 sm:p-6 hover:border-plimsoll/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <t.icon
                  className="w-5 h-5 text-plimsoll group-hover:drop-shadow-[0_0_10px_rgba(252,213,53,0.6)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="font-code text-[9px] text-plimsoll/30">S/{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="mt-4 font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">{t.title}</div>
              <p className="mt-2.5 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-white/55">{t.line}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
