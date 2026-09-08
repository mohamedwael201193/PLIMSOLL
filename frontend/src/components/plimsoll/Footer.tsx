"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { DiamondMark } from "./DiamondMark";

interface Props {
  glitch: boolean;
}

const INTRO =
  "The market is the sea. Exposure is the vessel. Capacity is the load line. The agent constantly checks whether the vessel is carrying more than the market can reasonably support.";

export default function Footer({ glitch }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const stripX = useTransform(scrollYProgress, [0, 1], ["4%", "-42%"]);
  const bigX = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  const agents = [
    { image: "/agents/agent-scout.png", name: "SCOUT" },
    { image: "/agents/agent-cartographer.png", name: "CARTOGRAPHER" },
    { image: "/agents/agent-executor.png", name: "EXECUTOR" },
    { image: "/agents/agent-watcher.png", name: "WATCHER" },
    { image: "/agents/agent-auditor.png", name: "AUDITOR" },
  ];

  return (
    <footer ref={ref} className="relative grid-gold noise scanlines overflow-hidden mt-auto">
      <div className={`relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8 pt-14 sm:pt-20 ${glitch ? "glitch-on" : ""}`}>
        {/* intro + credits */}
        <div className="grid md:grid-cols-3 gap-8 pb-10 sm:pb-14 border-b-2 border-plimsoll-black/50">
          <p className="font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-plimsoll-black/85 max-w-sm">
            {INTRO}
          </p>
          <div className="font-code text-[10px] sm:text-xs tracking-[0.2em] text-plimsoll-black/70 leading-7">
            <span className="block text-plimsoll-black mb-2">PLIMSOLL</span>
            ESTIMATED EXIT CAPACITY UNDER STATED CONSTRAINTS
            <br />
            BUILT WITH BINANCE AGENT OS
            <br />
            SPINE: INVERT → LEGALIZE → APPROVAL → ACT
          </div>
          <div className="font-code text-[10px] sm:text-xs tracking-[0.2em] text-plimsoll-black/70 leading-7 md:text-right">
            <span className="block mb-2">SAFETY</span>
            NO SILENT SELLS — PROPOSE TRIM
            <br />
            STALE SNAPSHOTS REFUSE ACTION
            <br />
            PARTIAL FILLS ARE NOT SUCCESS
          </div>
        </div>

        {/* actions row */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <a href="#/app" className="tech-box font-code text-[11px] sm:text-sm tracking-[0.15em] text-plimsoll-black" aria-label="Open the capacity desk">
            CHECK YOUR CAPACITY
          </a>
          <span className="font-code text-[10px] sm:text-xs tracking-[0.25em] text-plimsoll-black/70">
            THE LINE MOVES WHEN THE MARKET MOVES
          </span>
        </div>
      </div>

      {/* scroll-driven agent specimen strip */}
      <div className="relative z-10 py-8 sm:py-10 overflow-hidden">
        <motion.div style={{ x: stripX }} className="flex gap-8 sm:gap-12 w-max pl-8">
          {[...agents, ...agents.slice(0, 2)].map((a, i) => (
            <div key={`${a.name}-${i}`} className="relative w-28 sm:w-40 lg:w-48 shrink-0">
              {/* T-shaped measurement brackets (specimen style) */}
              <div aria-hidden className="absolute -top-3 left-0 right-0 h-3 flex justify-center">
                <span className="w-px h-3 bg-plimsoll-black/70" />
              </div>
              <div aria-hidden className="absolute left-[-14px] top-0 bottom-0 w-3 flex flex-col justify-center">
                <span className="w-3 h-px bg-plimsoll-black/70" />
              </div>
              <div className="entity-card">
                <img src={a.image} alt={`${a.name} agent entity`} className="w-full h-auto" draggable={false} loading="lazy" />
              </div>
              <div className="mt-2 flex justify-between font-code text-[8px] sm:text-[9px] tracking-[0.18em] text-plimsoll-black/70">
                <span>{a.name}</span>
                <span>#{String(i + 1).padStart(2, "0")}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* giant watermark wordmark */}
      <motion.div style={{ x: bigX }} className="relative select-none pointer-events-none" aria-hidden>
        <span className="font-display block text-center leading-[0.8] text-[clamp(4rem,17.5vw,23rem)] text-outline tracking-tight whitespace-nowrap pb-2 -mb-4">
          PLIMSOLL
        </span>
      </motion.div>

      {/* bottom bar */}
      <div className="relative z-10 border-t-2 border-plimsoll-black/60 bg-plimsoll">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 font-code text-[9px] sm:text-[11px] tracking-[0.2em] text-plimsoll-black">
          <span className="flex items-center gap-2">
            <DiamondMark className="w-4 h-4" />
            <span className="glitch-text" data-text="PLIMSOLL">PLIMSOLL</span>
          </span>
          <span className="hidden lg:inline">OBSERVE → UNDERSTAND → PLAN → DECIDE → ASK → ACT → VERIFY → ADAPT</span>
          <span>BUILT WITH BINANCE AGENT OS · ©2026</span>
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => {
              try {
                const next = window.localStorage.getItem("plimsoll-safe-mode") === "1" ? "0" : "1";
                window.localStorage.setItem("plimsoll-safe-mode", next);
                window.dispatchEvent(new Event("plimsoll-motion"));
              } catch {
                /* ignore */
              }
            }}
          >
            REDUCED MOTION
          </button>
          <span>VERSION: 2.0.0-RC.1</span>
        </div>
      </div>
    </footer>
  );
}
