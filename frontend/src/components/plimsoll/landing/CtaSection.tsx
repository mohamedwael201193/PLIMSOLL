"use client";

import { motion } from "framer-motion";
import { DiamondMark } from "../DiamondMark";
import { SectionLabel, reveal, focusBlack } from "./shared";

interface Props {
  glitch: boolean;
}

export default function CtaSection({ glitch }: Props) {
  return (
    <section
      className={`relative grid-gold noise scanlines overflow-hidden py-24 sm:py-32 ${glitch ? "glitch-on" : ""}`}
      aria-label="Call to action"
    >
      {/* spinning sketchy circle — the instrument dial */}
      <div
        aria-hidden
        className="absolute top-10 right-4 sm:right-16 lg:right-32 w-40 h-40 sm:w-56 sm:h-56 pointer-events-none select-none"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full text-plimsoll-black/25 spin-slow">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4 2 9" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="14 7" />
          <line x1="50" y1="1" x2="50" y2="13" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50" y1="87" x2="50" y2="99" stroke="currentColor" strokeWidth="1.5" />
          <line x1="1" y1="50" x2="13" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <line x1="87" y1="50" x2="99" y2="50" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <DiamondMark className="w-6 h-6 sm:w-8 sm:h-8 text-plimsoll-black/60" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="11" name="DEPLOY" tone="gold" />

        <h2 className="font-display section-word mt-6 leading-[1.02] text-plimsoll-black">
          <motion.span {...reveal()} className="block">
            THE MARKET
          </motion.span>
          <motion.span {...reveal(0.08)} className="block">
            HAS A LOAD LINE.
          </motion.span>
          <motion.span {...reveal(0.16)} className="block text-outline mt-3">
            YOUR PORTFOLIO
          </motion.span>
          <motion.span {...reveal(0.24)} className="block text-outline">
            SHOULD TOO.
          </motion.span>
        </h2>

        <motion.div {...reveal(0.35)} className="mt-12 flex flex-wrap justify-center gap-4">
          <a
            href="#/app"
            className={`tech-box inline-flex items-center gap-3 font-code text-xs sm:text-sm tracking-[0.15em] text-plimsoll-black ${focusBlack}`}
            aria-label="Check your capacity — open the desk"
          >
            <DiamondMark className="w-4 h-4 shrink-0" />
            <span>CHECK YOUR CAPACITY</span>
          </a>
          <a
            href="#/app"
            className={`tech-box inline-flex items-center gap-3 font-code text-xs sm:text-sm tracking-[0.15em] text-plimsoll-black ${focusBlack}`}
            aria-label="Open the desk"
          >
            <span>OPEN THE DESK</span>
          </a>
        </motion.div>

        <motion.div
          {...reveal(0.45)}
          className="mt-10 flex items-center justify-center gap-4 font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll-black/60"
        >
          <span className="ticks flex-1 max-w-[120px] h-3" aria-hidden />
          <span className="text-center">
            BUILT WITH BINANCE AGENT OS — ESTIMATED EXIT CAPACITY UNDER STATED CONSTRAINTS
          </span>
          <span className="ticks flex-1 max-w-[120px] h-3" aria-hidden />
        </motion.div>
      </div>
    </section>
  );
}
