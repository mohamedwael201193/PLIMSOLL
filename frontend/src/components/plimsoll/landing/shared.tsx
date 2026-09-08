"use client";

import type { MotionProps } from "framer-motion";

/** Signature easing curve used across the PLIMSOLL design system. */
export const BEZIER: [number, number, number, number] = [0.19, 1, 0.22, 1];

/** Standard whileInView reveal — viewport once, margin -60px. */
export function reveal(delay = 0): MotionProps {
  return {
    initial: { opacity: 0, y: 34 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.7, ease: BEZIER, delay },
  };
}

/** Section label: `[ 01 — NAME ]` pattern. */
export function SectionLabel({
  index,
  name,
  tone = "dark",
  className = "",
}: {
  index: string;
  name: string;
  tone?: "dark" | "gold";
  className?: string;
}) {
  return (
    <span
      className={`font-code text-[10px] tracking-[0.3em] ${
        tone === "dark" ? "text-plimsoll/60" : "text-plimsoll-black/60"
      } ${className}`}
    >
      [ {index} — {name} ]
    </span>
  );
}

/** Four corner brackets for `.corner-frame-4` parents. */
export function Corners({ tone = "gold" }: { tone?: "gold" | "black" | "dim" }) {
  const border =
    tone === "black" ? "border-plimsoll-black" : tone === "dim" ? "border-white/30" : "border-plimsoll";
  return (
    <>
      <span aria-hidden className={`cf cf-tl ${border}`} />
      <span aria-hidden className={`cf cf-tr ${border}`} />
      <span aria-hidden className={`cf cf-bl ${border}`} />
      <span aria-hidden className={`cf cf-br ${border}`} />
    </>
  );
}

/** Keyboard focus ring helpers — gold on dark, black on gold. */
export const focusGold =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plimsoll";
export const focusBlack =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plimsoll-black";

/** Full USD formatting for instrument readouts (never abbreviated). */
export function fmtUsdFull(n: number): string {
  if (!isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
