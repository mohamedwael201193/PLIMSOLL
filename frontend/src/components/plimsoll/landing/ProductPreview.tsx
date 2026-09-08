"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AGENT_LOOP } from "@/lib/agents";
import { DEFAULT_CONSTRAINTS } from "@/lib/capacity";
import { intentText, postIntent } from "@/lib/oregon";
import { DiamondMark } from "../DiamondMark";
import { Corners, SectionLabel, reveal, BEZIER, focusBlack, fmtUsdFull } from "./shared";

interface Props {
  glitch: boolean;
}

const ASKED = 10000;
const ACT_INDEX = 5;

/** Decorative chart path — labelled illustration, not a live series. */
const CHART_PATH =
  "M0,58 L50,52 L100,64 L150,92 L200,108 L250,96 L300,84 L350,70 L400,62";
const POSITION_Y = 86;

export default function ProductPreview({ glitch }: Props) {
  const [capacity, setCapacity] = useState<number | null>(null);
  const [cls, setCls] = useState("UNKNOWN");
  const [binding, setBinding] = useState("—");
  const [status, setStatus] = useState<"OVER_CAPACITY" | "WITHIN_CAPACITY" | null>(null);
  const [rec, setRec] = useState("—");
  const [hash, setHash] = useState("AWAITING");

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
        setStatus(r.mapped.status);
        setRec(r.mapped.recommendation.replace(/_/g, " "));
        setHash(r.mapped.snapshot.hash);
      })
      .catch(() => {
        if (!alive) return;
        setCls("UNKNOWN");
      });
    return () => {
      alive = false;
    };
  }, []);

  const utilization =
    capacity && capacity > 0 ? Math.min(999, Math.round((ASKED / capacity) * 100)) : 0;
  const over = status === "OVER_CAPACITY";
  return (
    <section
      className={`relative grid-gold overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="Product preview — the operating instrument"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="08" name="THE DESK" tone="gold" />
        <h2 className="font-display section-word mt-4 text-plimsoll-black">
          AN OPERATING INSTRUMENT <span className="text-outline">FOR EXPOSURE</span>
        </h2>

        {/* the CSS-built desk mock */}
        <motion.div
          {...reveal(0.1)}
          className="corner-frame-4 text-plimsoll relative max-w-4xl mx-auto mt-12 border border-plimsoll-black/60 bg-plimsoll-ink scanlines"
        >
          <Corners tone="black" />

          <div className="relative z-10 p-4 sm:p-6">
            {/* mock window bar */}
            <div className="flex items-center justify-between font-code text-[8px] sm:text-[9px] tracking-[0.25em] text-white/40 border-b border-white/10 pb-3">
              <span>PLIMSOLL_DESK · ARKUSDT</span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-plimsoll rounded-full blink" aria-hidden />
                SNAPSHOT {hash}
              </span>
            </div>

            <div className="mt-4 grid sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-4">
              {/* mini capacity card */}
              <div className="border border-plimsoll/25 bg-plimsoll-black/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-code text-[10px] tracking-[0.15em] text-plimsoll">
                    <img src="/icons/ARK.png" alt="" className="w-3.5 h-3.5" draggable={false} loading="lazy" />
                    ARKUSDT
                  </span>
                  <span className="font-code text-[8px] tracking-[0.2em] border border-plimsoll/40 text-plimsoll/80 px-1.5 py-0.5">
                    {cls}
                  </span>
                </div>

                <div className="mt-3 font-display text-2xl sm:text-3xl text-plimsoll leading-none">
                  {capacity != null ? fmtUsdFull(capacity) : "—"}
                </div>
                <div className="font-code text-[8px] tracking-[0.2em] text-white/40 mt-1.5">
                  EXIT CAPACITY · ASKED {fmtUsdFull(ASKED)}
                </div>

                {/* utilization bar with the load-line marker */}
                <div className="mt-4">
                  <div className="relative h-2.5 border border-plimsoll/25 bg-plimsoll-black overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 1, ease: BEZIER, delay: 0.4 }}
                      className="absolute inset-y-0 left-0 bg-plimsoll origin-left"
                      style={{ width: `${Math.min(100, utilization)}%` }}
                    />
                    {/* the load line marker */}
                    <motion.span
                      aria-hidden
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ delay: 1.2, duration: 0.4 }}
                      className="absolute top-0 bottom-0 w-[2px] bg-white"
                      style={{ left: `${Math.min(100, utilization)}%`, boxShadow: "0 0 8px rgba(238,241,246,0.9)" }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between font-code text-[8px] tracking-[0.15em] text-white/40">
                    <span>UTILIZATION {utilization}%</span>
                    <span className="text-plimsoll">LINE</span>
                  </div>
                </div>

                {/* chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="font-code text-[8px] tracking-[0.2em] bg-plimsoll text-plimsoll-black px-1.5 py-0.5">
                    BINDS: {binding}
                  </span>
                  {over && (
                    <span className="font-code text-[8px] tracking-[0.2em] border border-rose-400/60 text-rose-300 px-1.5 py-0.5">
                      OVER CAPACITY
                    </span>
                  )}
                  <span className="font-code text-[8px] tracking-[0.2em] border border-white/20 text-white/50 px-1.5 py-0.5">
                    REC: {rec}
                  </span>
                </div>
              </div>

              {/* mini chart */}
              <div className="border border-plimsoll/25 bg-plimsoll-black/60 p-3">
                <div className="font-code text-[8px] tracking-[0.2em] text-white/40 mb-1">
                  ILLUSTRATION — OPEN THE DESK FOR LIVE SERIES
                </div>
                <svg viewBox="0 0 400 160" className="w-full h-auto" role="img" aria-label="Capacity line crossing below the position line, then recovering">
                  {/* gridlines */}
                  {[40, 80, 120].map((y) => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(238,241,246,0.08)" strokeWidth="1" />
                  ))}
                  {/* position line */}
                  <line x1="0" y1={POSITION_Y} x2="400" y2={POSITION_Y} stroke="rgba(238,241,246,0.55)" strokeWidth="1.5" strokeDasharray="6 5" />
                  {/* capacity path */}
                  <motion.path
                    d={CHART_PATH}
                    fill="none"
                    stroke="#FCD535"
                    strokeWidth="2.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3 }}
                  />
                  {/* the crossing point */}
                  <motion.circle
                    cx="200"
                    cy="108"
                    r="4"
                    fill="#FCD535"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: 1.3, duration: 0.3 }}
                  />
                  <text x="200" y="140" fill="rgba(251,113,133,0.9)" fontSize="9" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                    09:07 OVER
                  </text>
                  <text x="4" y="150" fill="rgba(238,241,246,0.35)" fontSize="9" fontFamily="monospace" letterSpacing="2">
                    09:00
                  </text>
                  <text x="396" y="150" fill="rgba(238,241,246,0.35)" fontSize="9" fontFamily="monospace" textAnchor="end" letterSpacing="2">
                    09:10
                  </text>
                </svg>
              </div>
            </div>

            {/* agent loop indicator */}
            <div className="mt-4 border-t border-white/10 pt-4 overflow-x-auto scroll-thin">
              <div className="flex items-center gap-1 min-w-max">
                {AGENT_LOOP.map((step, i) => (
                  <motion.span
                    key={step}
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.07 }}
                    className={`font-code text-[7px] sm:text-[8px] tracking-[0.12em] px-1.5 py-1 ${
                      i === ACT_INDEX
                        ? "bg-plimsoll text-plimsoll-black"
                        : "text-white/40 border border-white/10"
                    }`}
                  >
                    {step}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          {...reveal(0.2)}
          className="mt-6 text-center font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll-black/60"
        >
          THE DESK — EVERY NUMBER LABELLED. EVERY DECISION YOURS.
        </motion.div>

        <motion.div {...reveal(0.25)} className="mt-8 flex justify-center">
          <a
            href="#/app"
            className={`tech-box inline-flex items-center gap-3 font-code text-xs sm:text-sm tracking-[0.15em] text-plimsoll-black ${focusBlack}`}
            aria-label="Open the capacity desk"
          >
            <DiamondMark className="w-4 h-4 shrink-0" />
            <span>OPEN THE DESK</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
