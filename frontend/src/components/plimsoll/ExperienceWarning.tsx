"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { useAmbientScramble } from "@/lib/plimsoll-hooks";

interface Props {
  onChoose: (mode: "safe" | "glitch") => void;
}

/** Scattered ambient [LOADING] labels around the dark void. */
function AmbientLoading({ on }: { on: boolean }) {
  const items = [
    { t: "[LOADING]", x: "6%", y: "12%" },
    { t: "[BOOK_SNAPSHOT]", x: "72%", y: "8%" },
    { t: "P L I M S O L L", x: "10%", y: "50%" },
    { t: "[CAPACITY]", x: "68%", y: "44%" },
    { t: "[EXIT]", x: "8%", y: "80%" },
    { t: "OBSERVE // VERIFY", x: "62%", y: "82%" },
    { t: "[INIT]", x: "40%", y: "4%" },
    { t: "CONSTRAINTS FIRST", x: "44%", y: "92%" },
  ];
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none font-code text-[10px] tracking-[0.25em] text-plimsoll/30">
      {items.map((it, i) => (
        <AmbientLabel key={i} text={it.t} x={it.x} y={it.y} on={on} />
      ))}
    </div>
  );
}

function AmbientLabel({ text, x, y, on }: { text: string; x: string; y: string; on: boolean }) {
  const display = useAmbientScramble(text, on, 220);
  return (
    <span className="absolute blink" style={{ left: x, top: y }}>
      {display}
    </span>
  );
}

export default function ExperienceWarning({ onChoose }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-plimsoll-deep noise overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
    >
      <AmbientLoading on />
      {/* vertical word rails */}
      <div aria-hidden className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-[2.2rem] font-code text-[10px] tracking-[0.4em] text-plimsoll/25">
        {["P", "L", "I", "M", "S", "O", "L", "L"].map((c, i) => (
          <span key={i} className="blink" style={{ animationDelay: `${i * 0.12}s` }}>{c}</span>
        ))}
      </div>
      <div aria-hidden className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-[2.2rem] font-code text-[10px] tracking-[0.4em] text-plimsoll/25">
        {["C", "A", "P", "A", "C", "I", "T", "Y"].map((c, i) => (
          <span key={i} className="blink" style={{ animationDelay: `${i * 0.1}s` }}>{c}</span>
        ))}
      </div>

      {/* central gold modal */}
      <div className="relative h-full w-full grid place-items-center p-4">
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1], delay: 0.15 }}
          className="relative w-full max-w-2xl bg-plimsoll text-plimsoll-black p-6 sm:p-10 scanlines"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warning-title"
        >
          {/* corner brackets */}
          <span className="cf cf-tl absolute border-plimsoll-black" />
          <span className="cf cf-tr absolute border-plimsoll-black" />
          <span className="cf cf-bl absolute border-plimsoll-black" />
          <span className="cf cf-br absolute border-plimsoll-black" />

          <div className="flex items-center gap-3 font-code text-[10px] sm:text-xs tracking-[0.3em] mb-6">
            <TriangleAlert className="w-4 h-4" strokeWidth={2.4} aria-hidden />
            <span>EXPERIENCE&nbsp;WARNING</span>
            <span className="ml-auto hidden sm:inline">PLIMSOLL&nbsp;/&nbsp;OS</span>
          </div>

          <h1 id="warning-title" className="font-display text-[clamp(1.4rem,4.5vw,2.6rem)] leading-tight mb-5">
            THIS SITE FEATURES HIGH-CONTRAST VISUAL EFFECTS AND RAPID TRANSITIONS
          </h1>

          <p className="font-grotesk text-sm sm:text-base leading-relaxed max-w-xl mb-8">
            that may trigger seizures in people with photosensitive epilepsy. If you or
            someone you know has a history of photosensitive seizures, please select
            Safe&nbsp;Mode. Safe Mode disables glitch animations and the CRT overlay
            while preserving the full experience.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 font-code text-xs sm:text-sm tracking-[0.12em]">
            <button
              onClick={() => onChoose("safe")}
              className="tech-box text-plimsoll-black text-center focus-visible:outline-2 focus-visible:outline-plimsoll-black"
              aria-label="Use safe mode"
            >
              [ USE SAFE MODE ]
            </button>
            <button
              onClick={() => onChoose("glitch")}
              className="tech-box text-plimsoll-black text-center focus-visible:outline-2 focus-visible:outline-plimsoll-black"
              aria-label="Enable glitch effect"
            >
              [ ENABLE GLITCH EFFECT ]
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-plimsoll-black/30 flex flex-wrap gap-x-6 gap-y-2 font-code text-[10px] tracking-[0.2em] text-plimsoll-black/70">
            <span>VERSION 2.0.0–RC.1</span>
            <span>WRITES: OFF</span>
            <span>CLASSIFICATION: PAPER</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
