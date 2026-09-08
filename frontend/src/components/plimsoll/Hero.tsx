"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { HERO_AGENTS } from "@/lib/agents";
import { DiamondMark } from "./DiamondMark";

interface Props {
  glitch: boolean;
}

const NARRATIVE =
  "PLIMSOLL estimates exit capacity under your stated constraints — then keeps re-solving as the market changes. The market is the sea. Exposure is the vessel. Capacity is the load line.";

const STACK_WORDS = ["THE MARKET", "HAS A LOAD LINE.", "YOUR PORTFOLIO", "SHOULD TOO."];

const AGENT_NAMES = ["SCOUT", "CARTOGRAPHER", "EXECUTOR", "WATCHER", "AUDITOR"];

export default function Hero({ glitch }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  const leftX = useTransform(sx, [-1, 1], [18, -18]);
  const leftY = useTransform(sy, [-1, 1], [10, -10]);
  const centerX = useTransform(sx, [-1, 1], [8, -8]);
  const centerY = useTransform(sy, [-1, 1], [22, -22]);
  const rightX = useTransform(sx, [-1, 1], [-12, 12]);
  const rightY = useTransform(sy, [-1, 1], [8, -8]);

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <section
      id="top"
      ref={sectionRef}
      onMouseMove={onMouseMove}
      className={`relative grid-gold noise scanlines overflow-hidden pt-16 sm:pt-20 ${glitch ? "glitch-on" : ""}`}
      aria-label="Plimsoll hero"
    >
      {/* top meta row */}
      <div className="relative z-10 flex justify-between items-center gap-2 px-4 sm:px-8 font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll-black/70 overflow-hidden">
        <span className="truncate">ESTIMATED_EXIT_CAPACITY</span>
        <span className="hidden md:inline">INVERT → LEGALIZE → APPROVAL → ACT → VERIFY → RE-INVERT</span>
        <span className="hidden sm:inline shrink-0">UNDER_STATED_CONSTRAINTS</span>
      </div>

      {/* giant wordmark */}
      <div className="relative z-10 mt-4 sm:mt-8 px-2 sm:px-6 select-none">
        <h1 className="font-display hero-word text-plimsoll-black leading-[0.88]" aria-label="PLIMSOLL">
          <motion.span
            aria-hidden
            className="block glitch-text"
            data-text="PLIM"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1], delay: 0.15 }}
          >
            PLIM
          </motion.span>
          <motion.span
            aria-hidden
            className="block text-outline glitch-text"
            data-text="SOLL"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1], delay: 0.3 }}
          >
            SOLL
          </motion.span>
        </h1>
      </div>

      {/* content grid: message + agents */}
      <div className="relative z-10 mt-6 sm:mt-10 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-4 px-4 sm:px-8 pb-12">
        {/* left column */}
        <div className="min-w-0">
          {STACK_WORDS.map((w, i) => (
            <motion.div
              key={w}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1], delay: 0.4 + i * 0.15 }}
              className={`${i === STACK_WORDS.length - 1 ? "" : "border-b-2"} border-plimsoll-black/60 py-2 sm:py-3`}
            >
              <span
                className={`font-display glitch-text ${
                  i % 2 === 0 ? "stack-word text-plimsoll-black" : "text-outline stack-word"
                }`}
                data-text={w}
              >
                {w}
              </span>
            </motion.div>
          ))}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.7 }}
            className="mt-8 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-plimsoll-black/85 max-w-md"
          >
            {NARRATIVE}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <a
              href="#/app"
              className="tech-box inline-flex items-center gap-3 font-code text-xs sm:text-sm tracking-[0.15em] text-plimsoll-black"
              aria-label="Check your capacity — open the desk"
            >
              <DiamondMark className="w-4 h-4 shrink-0" />
              <span>CHECK YOUR CAPACITY</span>
            </a>
            <a
              href="#/app"
              className="tech-box inline-flex items-center gap-3 font-code text-xs sm:text-sm tracking-[0.15em] text-plimsoll-black"
              aria-label="Open the desk"
            >
              <span>OPEN THE DESK</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-8 flex items-center gap-3 font-code text-[9px] tracking-[0.3em] text-plimsoll-black/60"
          >
            <span className="blink">◆</span>
            <span>BUILT WITH BINANCE AGENT OS</span>
          </motion.div>
        </div>

        {/* right column: agent entities */}
        <div className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[520px]">
          <motion.div
            style={{ x: leftX, y: leftY }}
            initial={{ opacity: 0, x: -80, rotate: -8 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1], delay: 0.5 }}
            className="absolute left-[2%] top-[12%] w-[38%] sm:w-[40%] z-10"
          >
            <AgentImg src={HERO_AGENTS.left} alt="Scout — the observer entity reading live market conditions" glitch={glitch} />
          </motion.div>

          <motion.div
            style={{ x: centerX, y: centerY }}
            initial={{ opacity: 0, y: 60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.65 }}
            className="absolute left-[31%] top-0 w-[46%] z-20"
          >
            <AgentImg
              src={HERO_AGENTS.center}
              alt="Cartographer — the measurer entity mapping exit capacity"
              glitch={glitch}
              featured
            />
          </motion.div>

          <motion.div
            style={{ x: rightX, y: rightY }}
            initial={{ opacity: 0, x: 80, rotate: 8 }}
            animate={{ opacity: 1, x: 0, rotate: 5 }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1], delay: 0.8 }}
            className="absolute right-[2%] top-[16%] w-[36%] sm:w-[38%] z-10"
          >
            <AgentImg src={HERO_AGENTS.right} alt="Executor — the acting entity, gated behind approvals" glitch={glitch} />
          </motion.div>

          {/* agent name rail */}
          <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-3 sm:gap-5 font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll-black/70 flex-wrap">
            {AGENT_NAMES.map((n) => (
              <span key={n} className="hover:text-plimsoll-black transition-colors">
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* the load line visual: exposure marker moving against the line */}
      <div className="relative z-10 px-4 sm:px-8 pb-6">
        <div className="flex items-center gap-4">
          <span className="font-code text-[9px] tracking-[0.25em] text-plimsoll-black/60 shrink-0">EXIT 0</span>
          <div className="ticks flex-1 text-plimsoll-black/50 relative h-6">
            <motion.span
              aria-hidden
              className="absolute w-1.5 h-8 bg-plimsoll-black"
              style={{ top: "-4px" }}
              initial={{ left: "88%" }}
              animate={{ left: ["88%", "62%", "88%"] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              aria-hidden
              className="absolute left-[30%] top-1/2 -translate-y-1/2 w-10 h-4 border-2 border-plimsoll-black bg-plimsoll"
            />
          </div>
          <span className="font-code text-[9px] tracking-[0.25em] text-plimsoll-black/60 shrink-0">HORIZON</span>
        </div>
        <div className="mt-3 flex justify-between items-center font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll-black/70">
          <span>THE LINE MOVES WHEN THE MARKET MOVES</span>
          <span className="hidden sm:inline">PARTICIPATION: 10% ADV DEFAULT</span>
          <span>VERSION: 2.0.0-RC.1</span>
        </div>
      </div>
    </section>
  );
}

function AgentImg({ src, alt, glitch, featured = false }: { src: string; alt: string; glitch: boolean; featured?: boolean }) {
  return (
    <div className={`glitch-img entity-card ${featured ? "pulse-gold" : ""}`}>
      <div className={featured ? "relative" : ""}>
        {featured && (
          <>
            <span className="cf cf-tl absolute border-plimsoll-black" />
            <span className="cf cf-tr absolute border-plimsoll-black" />
            <span className="cf cf-bl absolute border-plimsoll-black" />
            <span className="cf cf-br absolute border-plimsoll-black" />
          </>
        )}
        <img
          src={src}
          alt={alt}
          className="w-full h-auto drop-shadow-[0_18px_40px_rgba(6,7,12,0.55)]"
          draggable={false}
        />
      </div>
    </div>
  );
}
