"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onComplete: () => void;
  glitch: boolean;
}

const WORD_A = "PLIMSOLL";
const WORD_B = "CAPACITY";

export default function Preloader({ onComplete, glitch }: Props) {
  const [phase, setPhase] = useState(0); // 0 letters, 1 version, 2 done
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 3200);
    const done = setTimeout(() => onComplete(), 4000);
    const id = setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 14));
    }, 180);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(done);
      clearInterval(id);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[99] bg-plimsoll-deep noise overflow-hidden grid place-items-center"
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      aria-hidden
    >
      {/* scattered ambient labels */}
      <div className="absolute inset-0 pointer-events-none font-code text-[10px] tracking-[0.25em] text-plimsoll/30">
        {[
          "[LOADING]", "[SNAPSHOT]", "[DEPTH]", "[FILTERS]", "[BOOK]", "[HORIZON]", "[BPS]", "[APPROVAL]",
        ].map((t, i) => (
          <span
            key={i}
            className="absolute blink"
            style={{
              left: `${[6, 70, 10, 76, 14, 64, 38, 44][i]}%`,
              top: `${[10, 8, 46, 40, 78, 76, 20, 88][i]}%`,
              animationDelay: `${i * 0.14}s`,
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* corner version blocks (like the original VERSION 2.0.0–RC.1 tiles) */}
      <div
        className={`absolute font-code text-[10px] tracking-[0.25em] text-plimsoll/60 transition-opacity duration-700 ${
          phase >= 1 ? "opacity-100" : "opacity-0"
        }`}
        style={{ top: "18%", left: "50%", transform: "translateX(-50%)" }}
      >
        VERSION 2.0.0 – RC.1
      </div>

      {/* scrambling word rails */}
      <div className="relative flex gap-6 sm:gap-14 items-start justify-center">
        <LetterRail word={WORD_A} active={phase < 2} glitch={glitch} delay={0} />
        <LetterRail word={WORD_B} active={phase < 2} glitch={glitch} delay={260} />
      </div>

      {/* progress bar */}
      <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-56 sm:w-72">
        <div className="flex justify-between font-code text-[9px] tracking-[0.3em] text-plimsoll/60 mb-2">
          <span className="blink">LOADING. PLEASE WAIT.</span>
          <span>{Math.floor(progress)}%</span>
        </div>
        <div className="h-[6px] border border-plimsoll/40">
          <div className="h-full bg-plimsoll transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="absolute bottom-8 right-8 font-code text-[10px] tracking-[0.25em] text-plimsoll/40">
        CLASSIFICATION: PAPER · WRITES OFF
      </div>
    </motion.div>
  );
}

function LetterRail({
  word,
  active,
  glitch,
  delay,
}: {
  word: string;
  active: boolean;
  glitch: boolean;
  delay: number;
}) {
  const [chars, setChars] = useState<string[]>(() => word.split("").map(() => "_"));
  const [settled, setSettled] = useState(0);
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>";

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let step = 0;
    const id = setTimeout(() => {
      const tick = () => {
        if (cancelled) return;
        step += 1;
        const nextSettled = Math.min(word.length, Math.floor(step / 4));
        setSettled(nextSettled);
        setChars(
          word.split("").map((c, i) => {
            if (i < nextSettled) return c;
            if (c === " ") return " ";
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
        );
        if (nextSettled < word.length) setTimeout(tick, 55 + Math.random() * 60);
      };
      tick();
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [word, active, delay]);

  const shown = active ? chars : word.split("");

  return (
    <div className="flex flex-col gap-1.5">
      {shown.map((c, i) => (
        <span
          key={i}
          className={`font-display text-2xl sm:text-4xl transition-colors duration-200 ${
            i < (active ? settled : word.length) ? "text-plimsoll" : "text-plimsoll/35"
          } ${glitch && i === 0 ? "glitch-text" : ""}`}
          data-text={c}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
