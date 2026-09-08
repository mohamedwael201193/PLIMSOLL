"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Corners, SectionLabel, reveal, BEZIER, fmtUsdFull } from "./shared";
import { DEFAULT_CONSTRAINTS } from "@/lib/capacity";
import { intentText, postIntent } from "@/lib/oregon";

interface Props {
  glitch: boolean;
}

/** Deterministic depth-ladder heights (percent of track height). */
const LADDER = [38, 62, 47, 70, 41, 52, 34, 44, 29, 36, 24, 18, 27, 15, 20, 11];
const GOLD_BARS = 5;

export default function HiddenProblem({ glitch }: Props) {
  const markValue = 10000;
  const [exitCapacity, setExitCapacity] = useState<number | null>(null);
  const [cls, setCls] = useState("UNKNOWN");

  useEffect(() => {
    let alive = true;
    postIntent(intentText({ ...DEFAULT_CONSTRAINTS, targetNotional: markValue }), {
      ...DEFAULT_CONSTRAINTS,
      targetNotional: markValue,
    })
      .then((r) => {
        if (!alive) return;
        setCls(r.mapped.classification);
        setExitCapacity(r.mapped.exitCapacity);
      })
      .catch(() => {
        if (!alive) return;
        setCls("UNKNOWN");
        setExitCapacity(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const supported = exitCapacity != null && exitCapacity > 0 ? exitCapacity / markValue : 0;
  const unsupported = exitCapacity != null ? Math.max(0, markValue - exitCapacity) : 0;

  return (
    <section
      className={`relative grid-dark noise overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="The hidden problem — portfolio value is not exit capacity"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-12 lg:gap-8 items-end">
          {/* left: statement + panels */}
          <div className="min-w-0">
            <SectionLabel index="01" name="THE HIDDEN PROBLEM" />

            <h2 className="font-display section-word mt-4 leading-[1.02]">
              <motion.span {...reveal()} className="block text-white">
                YOUR PORTFOLIO
              </motion.span>
              <motion.span {...reveal(0.1)} className="block text-outline-gold">
                VALUE IS NOT
              </motion.span>
              <motion.span {...reveal(0.2)} className="block text-white">
                YOUR EXIT CAPACITY.
              </motion.span>
            </h2>

            <motion.p
              {...reveal(0.3)}
              className="mt-6 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/70 max-w-lg"
            >
              The number on your screen is based on the current price. PLIMSOLL asks what the market
              can actually absorb — the size you can hold and still exit inside your cost and time
              constraints.
            </motion.p>

            {/* two contrasting panels */}
            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              <motion.div
                {...reveal()}
                className="corner-frame-4 text-white/30 border border-white/15 bg-white/[0.02] p-5 sm:p-6"
              >
                <Corners tone="dim" />
                <div className="font-code text-[10px] tracking-[0.3em] text-white/45">
                  ASKED · ARKUSDT · 1 DAY
                </div>
                <div className="font-display text-3xl sm:text-4xl mt-3 text-white/75">
                  {fmtUsdFull(markValue)}
                </div>
                <div className="font-code text-[9px] tracking-[0.2em] text-white/35 mt-3 leading-relaxed">
                  A STATED INTENT — NOT A CONNECTED ACCOUNT
                </div>
              </motion.div>

              <motion.div
                {...reveal(0.12)}
                className="corner-frame-4 text-plimsoll border border-plimsoll/40 bg-plimsoll/[0.04] p-5 sm:p-6 shadow-[0_0_60px_rgba(252,213,53,0.12)]"
              >
                <Corners tone="gold" />
                <div className="font-code text-[10px] tracking-[0.3em] text-plimsoll/80">
                  EXIT_CAPACITY · {cls}
                </div>
                <div className="font-display text-3xl sm:text-4xl mt-3 text-plimsoll drop-shadow-[0_0_22px_rgba(252,213,53,0.45)]">
                  {exitCapacity != null ? fmtUsdFull(exitCapacity) : "—"}
                </div>
                <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/50 mt-3 leading-relaxed">
                  WHAT THE BOOK CAN ABSORB — SAME POSITION
                </div>
              </motion.div>
            </div>

            {/* the difference caption */}
            <motion.div {...reveal(0.2)} className="mt-5 flex items-center gap-4">
              <span className="ticks flex-1 h-3 text-plimsoll/25" aria-hidden />
              <span className="font-code text-[10px] sm:text-[11px] tracking-[0.25em] text-plimsoll whitespace-nowrap">
                THE DIFFERENCE IS THE HIDDEN COST
              </span>
              <span className="ticks flex-1 h-3 text-plimsoll/25" aria-hidden />
            </motion.div>
          </div>

          {/* right: the scout reading the book — flat bg blends with section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, ease: BEZIER, delay: 0.15 }}
            className="relative min-w-0 hidden sm:block"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="max-w-[380px] mx-auto lg:mr-0"
            >
              <img
                src="/agents/agent-scout.png"
                alt="Scout — the observer entity reading the live order book"
                className="w-full h-auto drop-shadow-[0_24px_60px_rgba(6,7,12,0.8)]"
                draggable={false}
                loading="lazy"
              />
            </motion.div>
            <div className="font-code text-[9px] tracking-[0.25em] text-plimsoll/50 text-center lg:text-right mt-2">
              SCOUT / OBSERVE — READS THE VISIBLE BOOK
            </div>
          </motion.div>
        </div>

        {/* depth visual: shallow book under a big position */}
        <div className="mt-16 sm:mt-20">
          <motion.div
            {...reveal()}
            className="flex flex-wrap items-baseline justify-between gap-3 font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-white/45"
          >
            <span>
              VISIBLE BID DEPTH · ARKUSDT · 1000 LEVELS WALKED
            </span>
            <span className="text-plimsoll/70">ASKED: {fmtUsdFull(markValue)} · {cls}</span>
          </motion.div>

          {/* ladder */}
          <motion.div
            {...reveal(0.1)}
            className="relative mt-6 h-24 sm:h-28 border border-white/15 bg-plimsoll-black/40 px-2 py-2"
          >
            <div className="absolute -top-5 left-[31%] -translate-x-1/2 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-plimsoll whitespace-nowrap">
              COST BUDGET EXHAUSTED — {exitCapacity != null ? fmtUsdFull(exitCapacity) : "AWAITING LIVE"}
            </div>
            <span
              aria-hidden
              className="absolute top-0 bottom-0 left-[31%] w-px bg-plimsoll"
              style={{ boxShadow: "0 0 8px rgba(252,213,53,0.7)" }}
            />
            <div className="flex items-end gap-[3px] h-full" aria-hidden>
              {LADDER.map((h, i) => {
                const gold = i < GOLD_BARS;
                return (
                  <motion.span
                    key={i}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, ease: BEZIER, delay: 0.15 + i * 0.05 }}
                    style={{ height: `${h}%` }}
                    className={`flex-1 origin-bottom ${
                      gold
                        ? "bg-plimsoll/90"
                        : "bg-white/[0.07] border-x border-t border-white/15 bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_5px,rgba(238,241,246,0.1)_5px,rgba(238,241,246,0.1)_6px)]"
                    }`}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* total bar: supported vs unsupported */}
          <motion.div
            {...reveal(0.25)}
            className="mt-4 relative h-3 sm:h-4 border border-white/20 bg-plimsoll-black/60 overflow-hidden"
            role="img"
            aria-label={`Supported depth ${exitCapacity != null ? fmtUsdFull(exitCapacity) : "awaiting"} of a ${fmtUsdFull(markValue)} asked notional — the remainder is unsupported exposure`}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 1, ease: BEZIER, delay: 0.3 }}
              className="absolute inset-y-0 left-0 bg-plimsoll origin-left"
              style={{ width: `${supported * 100}%` }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_7px,rgba(238,241,246,0.16)_7px,rgba(238,241,246,0.16)_8px)]"
              style={{ width: `${(1 - supported) * 100}%` }}
            />
          </motion.div>

          <div className="mt-3 flex justify-between font-code text-[9px] sm:text-[10px] tracking-[0.2em]">
            <motion.span {...reveal(0.35)} className="text-plimsoll">
              SUPPORTED · {exitCapacity != null ? fmtUsdFull(exitCapacity) : "—"}
            </motion.span>
            <motion.span {...reveal(0.45)} className="text-white/60 text-right">
              UNSUPPORTED EXPOSURE · {fmtUsdFull(unsupported)}
            </motion.span>
          </div>
        </div>
      </div>
    </section>
  );
}
