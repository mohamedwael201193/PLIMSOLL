"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DEFAULT_CONSTRAINTS } from "@/lib/capacity";
import { intentText, postIntent } from "@/lib/oregon";
import { SectionLabel, reveal, BEZIER, focusGold, fmtUsdFull } from "./shared";

interface Props {
  glitch: boolean;
}

const ASKED = 10000;

export default function ReSolve({ glitch }: Props) {
  const [capacity, setCapacity] = useState<number | null>(null);
  const [cls, setCls] = useState("UNKNOWN");
  const [binding, setBinding] = useState("—");
  const [rec, setRec] = useState("—");
  const [clock, setClock] = useState("--:--");

  useEffect(() => {
    let alive = true;
    postIntent(intentText({ ...DEFAULT_CONSTRAINTS, targetNotional: ASKED }), {
      ...DEFAULT_CONSTRAINTS,
      targetNotional: ASKED,
    })
      .then((r) => {
        if (!alive) return;
        setCapacity(r.mapped.exitCapacity);
        setCls(r.mapped.classification);
        setBinding(r.mapped.binding);
        setRec(r.mapped.recommendation.replace(/_/g, " "));
        setClock(new Date(r.mapped.snapshot.ts).toISOString().slice(11, 16));
      })
      .catch(() => {
        if (!alive) return;
        setCls("UNKNOWN");
      });
    return () => {
      alive = false;
    };
  }, []);

  const over = capacity != null && ASKED > capacity;
  const scaleMax = Math.max(ASKED, capacity || 0, 1);
  const posPct = (ASKED / scaleMax) * 100;
  const capPct = capacity != null ? (capacity / scaleMax) * 100 : 0;

  return (
    <section
      className={`relative grid-dark overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="Continuous re-solve"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="05" name="RE-SOLVE" />
        <h2 className="font-display section-word mt-4 text-white">
          CONTINUOUS <span className="text-outline-gold">RE-SOLVE</span>
        </h2>
        <motion.p {...reveal(0.1)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] text-white/60 max-w-lg">
          Capacity is not a number you compute once. It is re-solved against every fresh snapshot.
          This panel shows the current Oregon solve for $10,000 of ARK — not a manufactured history.
        </motion.p>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
          <motion.div {...reveal()} className="border border-plimsoll/20 bg-plimsoll-black/50 p-4 sm:p-8 relative">
            <div className="flex flex-wrap items-center justify-between gap-2 font-code text-[9px] sm:text-[10px] tracking-[0.2em]">
              <span className="text-white/45">CURRENT SOLVE · ASKED {fmtUsdFull(ASKED)} ARKUSDT</span>
              <span className="border border-plimsoll/40 text-plimsoll/70 px-2 py-0.5">
                CLASSIFICATION: {cls}
              </span>
            </div>

            <div className="hidden md:block relative mt-8 h-64">
              <div
                className="absolute left-0 right-0 flex items-center"
                style={{ top: `${100 - posPct}%` }}
                aria-hidden
              >
                <span className="flex-1 border-t-2 border-dashed border-white/45" />
                <span className="font-code text-[9px] tracking-[0.2em] text-white/70 ml-3 whitespace-nowrap">
                  ASKED {fmtUsdFull(ASKED)}
                </span>
              </div>

              <div className="absolute inset-x-0 top-2 bottom-0 grid grid-cols-1">
                <div className="relative h-full flex flex-col justify-end items-center max-w-xs mx-auto w-full">
                  {over && (
                    <div className="absolute bottom-full mb-2 text-center">
                      <div className="font-code text-[8px] tracking-[0.18em] text-rose-400">OVER CAPACITY</div>
                      <div className="font-code text-[10px] sm:text-[11px] tabular-nums text-rose-300">
                        {capacity != null ? fmtUsdFull(capacity) : "—"}
                      </div>
                    </div>
                  )}
                  {!over && (
                    <div className="absolute bottom-full mb-2 text-center">
                      <div className="font-code text-[10px] sm:text-[11px] tabular-nums text-plimsoll">
                        {capacity != null ? fmtUsdFull(capacity) : "AWAITING LIVE"}
                      </div>
                    </div>
                  )}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.8, ease: BEZIER, delay: 0.2 }}
                    className={`w-full origin-bottom ${
                      over
                        ? "bg-gradient-to-t from-rose-400/50 to-rose-400/90"
                        : "bg-gradient-to-t from-plimsoll/50 to-plimsoll/95"
                    }`}
                    style={{ height: `${capPct}%` }}
                  />
                </div>
              </div>

              {over && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.7, rotate: -10 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: -6 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.35, ease: BEZIER, delay: 1.6 }}
                  className="absolute -top-3 right-2 sm:right-8 border-[3px] border-plimsoll text-plimsoll font-display text-lg sm:text-2xl tracking-[0.04em] px-3 sm:px-5 py-1.5 select-none glitch-text"
                  data-text="THE LINE MOVED."
                  style={{ textShadow: "0 0 24px rgba(252,213,53,0.4)" }}
                  aria-hidden
                >
                  THE LINE MOVED.
                </motion.div>
              )}
            </div>

            <div className="hidden md:block mt-3 pt-3 border-t border-plimsoll/15 font-code text-[9px] tracking-[0.2em] text-white/50 text-center">
              {clock} UTC · OPEN THE DESK TO ACCUMULATE A LIVE SERIES
            </div>

            <div className="md:hidden mt-6 font-code text-[12px] tabular-nums text-plimsoll">
              {capacity != null ? fmtUsdFull(capacity) : "AWAITING LIVE"} · ASKED {fmtUsdFull(ASKED)}
            </div>
          </motion.div>

          <motion.div {...reveal(0.15)} className="border border-plimsoll/25 bg-plimsoll-black/60 p-5 sm:p-6">
            <div className="flex items-center justify-between font-code text-[9px] sm:text-[10px] tracking-[0.25em]">
              <span className="text-plimsoll">[ NOW — CURRENT SOLVE ]</span>
              <span className="text-white/30">{cls}</span>
            </div>

            <div className="mt-4 font-code text-[11px] sm:text-xs tracking-[0.1em] space-y-2 tabular-nums">
              <div className="flex justify-between">
                <span className="text-white/50">ASKED</span>
                <span className="text-white">{fmtUsdFull(ASKED)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">CAPACITY</span>
                <span className={over ? "text-rose-300" : "text-plimsoll"}>
                  {capacity != null ? fmtUsdFull(capacity) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">BINDING</span>
                <span className="text-plimsoll">{binding}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">REC</span>
                <span className={over ? "text-rose-400" : "text-plimsoll"}>{rec}</span>
              </div>
            </div>

            <p className="mt-4 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-white/65">
              The asked notional did not change — the live book decides whether it still fits.
            </p>

            <div className="mt-5 font-code text-[9px] tracking-[0.25em] text-plimsoll/70">ACTION</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {["TRIM", "STAGE", "WAIT"].map((a) => (
                <a
                  key={a}
                  href="#/app"
                  className={`tech-box-dark font-code text-[10px] sm:text-[11px] tracking-[0.15em] ${focusGold}`}
                >
                  {a}
                </a>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-plimsoll/15 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-plimsoll/50 leading-relaxed">
              THE AGENT PROPOSES. YOU DECIDE. NO SILENT SELLS.
            </div>
          </motion.div>
        </div>

        <motion.blockquote {...reveal(0.1)} className="mt-12 max-w-2xl border-l-2 border-plimsoll pl-4 sm:pl-5">
          <p className="font-grotesk text-[14px] sm:text-[16px] leading-relaxed text-white/75">
            This is one of the most important product differentiators.{" "}
            <span className="text-plimsoll">The market changes. Therefore the line changes.</span>
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
}
