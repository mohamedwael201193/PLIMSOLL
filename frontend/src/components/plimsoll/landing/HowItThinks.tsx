"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { SectionLabel, reveal, BEZIER } from "./shared";

interface Props {
  glitch: boolean;
}

const CONNECT = (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5, ease: BEZIER }}
    className="flex justify-center py-2"
    aria-hidden
  >
    <ArrowDown className="w-5 h-5 text-plimsoll" strokeWidth={1.5} />
  </motion.div>
);

export default function HowItThinks({ glitch }: Props) {
  return (
    <section
      id="how-it-thinks"
      className={`relative grid-dark-dense overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="How Plimsoll thinks"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="03" name="METHOD" />
        <h2 className="font-display section-word mt-4 text-white">
          HOW <span className="text-outline-gold">PLIMSOLL</span> THINKS
        </h2>
        <motion.p {...reveal(0.15)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] text-white/60 max-w-lg">
          One pass, top to bottom. Intent becomes constraints, constraints meet the live book,
          and the lowest ceiling wins.
        </motion.p>

        {/* the flow */}
        <div className="mt-12 sm:mt-16 mx-auto max-w-2xl">
          {/* 01 user intent */}
          <motion.div
            {...reveal()}
            className="flex gap-4 items-start border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/40 transition-colors"
          >
            <span className="font-code text-[10px] text-plimsoll/30 pt-1 shrink-0">01</span>
            <div className="min-w-0">
              <div className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">USER INTENT</div>
              <p className="font-grotesk text-[12px] sm:text-[13px] text-white/60 mt-1.5 leading-relaxed">
                “I need to exit $10,000 of ARK within a day, without paying through the book.”
              </p>
            </div>
          </motion.div>

          {CONNECT}

          {/* 02 constraints */}
          <motion.div
            {...reveal(0.05)}
            className="flex gap-4 items-start border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/40 transition-colors"
          >
            <span className="font-code text-[10px] text-plimsoll/30 pt-1 shrink-0">02</span>
            <div className="min-w-0">
              <div className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">CONSTRAINTS</div>
              <p className="font-code text-[10px] sm:text-[11px] text-white/55 mt-2 leading-relaxed tracking-[0.05em]">
                TARGET_NOTIONAL · MAX_EXIT_COST · EXIT_HORIZON · PARTICIPATION · BOOK_FRACTION
              </p>
            </div>
          </motion.div>

          {CONNECT}

          {/* 03 live market */}
          <motion.div
            {...reveal(0.05)}
            className="flex gap-4 items-start border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/40 transition-colors"
          >
            <span className="font-code text-[10px] text-plimsoll/30 pt-1 shrink-0">03</span>
            <div className="min-w-0">
              <div className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">LIVE MARKET</div>
              <p className="font-grotesk text-[12px] sm:text-[13px] text-white/60 mt-1.5 leading-relaxed">
                1000 levels of visible bid depth, 24-hour volume and exchange filters — captured
                right now, hashed, and stamped.
              </p>
            </div>
          </motion.div>

          {CONNECT}

          {/* 04 the two capacities, side by side */}
          <div className="grid sm:grid-cols-2 gap-4">
            <motion.div
              {...reveal(0.05)}
              className="border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/40 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-code text-[10px] text-plimsoll/30">04A</span>
                <span className="font-code text-[8px] tracking-[0.2em] text-plimsoll/40">MIN(Depth, Budget)</span>
              </div>
              <div className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll mt-2">COST CAPACITY</div>
              <p className="font-grotesk text-[12px] text-white/60 mt-1.5 leading-relaxed">
                Walk the bid book level by level until impact plus fees cross the budget.
              </p>
            </motion.div>
            <motion.div
              {...reveal(0.12)}
              className="border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/40 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-code text-[10px] text-plimsoll/30">04B</span>
                <span className="font-code text-[8px] tracking-[0.2em] text-plimsoll/40">Min(Part, Volume, Time)</span>
              </div>
              <div className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll mt-2">TIME CAPACITY</div>
              <p className="font-grotesk text-[12px] text-white/60 mt-1.5 leading-relaxed">
                Participation × volume that fits inside the exit horizon.
              </p>
            </motion.div>
          </div>

          {/* merge connector */}
          <div className="relative h-8 py-2" aria-hidden>
            <span className="absolute left-[25%] right-[25%] top-1/2 h-px bg-plimsoll/40" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-code text-[10px] text-plimsoll bg-plimsoll-deep px-2">
              ▼
            </span>
          </div>

          {/* 05 binding constraint — highlighted */}
          <motion.div
            {...reveal()}
            className="corner-frame-4 text-plimsoll relative border border-plimsoll bg-plimsoll/[0.08] p-5 sm:p-6 shadow-[0_0_50px_rgba(252,213,53,0.14)]"
          >
            <span aria-hidden className="cf cf-tl border-plimsoll" />
            <span aria-hidden className="cf cf-tr border-plimsoll" />
            <span aria-hidden className="cf cf-bl border-plimsoll" />
            <span aria-hidden className="cf cf-br border-plimsoll" />
            <div className="flex gap-4 items-start">
              <span className="font-code text-[10px] text-plimsoll/50 pt-1 shrink-0">05</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-code text-xs sm:text-sm tracking-[0.2em] text-plimsoll">BINDING CONSTRAINT</span>
                  <span className="font-code text-[8px] tracking-[0.2em] bg-plimsoll text-plimsoll-black px-2 py-0.5">
                    THE LINE
                  </span>
                </div>
                <p className="font-grotesk text-[12px] sm:text-[13px] text-white/70 mt-2 leading-relaxed">
                  The lower of the two capacities, legalized to exchange filters. Everything above
                  it is unsupported exposure.
                </p>
              </div>
            </div>
          </motion.div>

          {CONNECT}

          {/* 06 action */}
          <motion.div
            {...reveal()}
            className="border border-plimsoll/30 bg-plimsoll/[0.05] p-4 sm:p-5"
          >
            <div className="flex gap-4 items-center flex-wrap">
              <span className="font-code text-[10px] text-plimsoll/30 shrink-0">06</span>
              <span className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">ACTION</span>
              <span className="flex-1" />
              {["HOLD", "SIZE_DOWN", "TRIM"].map((a) => (
                <span
                  key={a}
                  className="font-code text-[9px] tracking-[0.15em] border border-plimsoll/30 text-plimsoll/80 px-2 py-1"
                >
                  {a}
                </span>
              ))}
            </div>
            <p className="font-grotesk text-[12px] text-white/50 mt-2.5 leading-relaxed">
              Proposed by the agent. Approved by you. Executed once, then read back.
            </p>
          </motion.div>
        </div>

        {/* the deterministic note */}
        <motion.div
          {...reveal(0.1)}
          className="mt-10 sm:mt-12 max-w-2xl mx-auto border-l-2 border-plimsoll pl-4 sm:pl-5 py-1"
        >
          <p className="font-grotesk text-[13px] sm:text-[14px] text-white/75 leading-relaxed">
            Financial math is deterministic.{" "}
            <span className="text-plimsoll">
              The language layer may parse intent; it must not compute capacity.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
