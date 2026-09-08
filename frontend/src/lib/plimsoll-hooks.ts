"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/\\[]=+_-";

/**
 * Text scramble: reveals target text by cycling random glyphs,
 * one settled character at a time. Used across the site for
 * the boot/decode aesthetic.
 */
export function useScramble(
  text: string,
  opts: { speed?: number; delay?: number; enabled?: boolean; play?: boolean } = {}
) {
  const { speed = 42, delay = 0, enabled = true, play = true } = opts;
  const active = enabled && play;
  const [display, setDisplay] = useState(() => (active ? "" : text));

  useEffect(() => {
    if (!active) return;
    let settled = 0;
    let raf = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (settled <= text.length) {
        const scrambled =
          text.slice(0, settled) +
          Array.from({ length: Math.max(0, text.length - settled) }, () =>
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          ).join("");
        setDisplay(scrambled);
        settled += Math.random() > 0.72 ? 2 : 1;
        raf = window.setTimeout(tick, speed + Math.random() * speed * 0.8);
      } else {
        setDisplay(text);
      }
    };

    const start = () => {
      if (cancelled) return;
      tick();
    };
    const timeoutId = setTimeout(start, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(raf);
    };
  }, [text, speed, delay, active]);

  return active ? display : text;
}

/** Interval-scrambled ambient text for [LOADING] style labels. */
export function useAmbientScramble(text: string, active: boolean, intervalMs = 160) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setDisplay(
        Array.from(text, (ch) =>
          ch === " " ? " " : Math.random() > 0.5 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : ch
        ).join("")
      );
    }, intervalMs);
    return () => clearInterval(id);
  }, [text, active, intervalMs]);
  return active ? display : text;
}

/**
 * Mouse-follow parallax values normalized to [-1, 1].
 * (Currently unused by components — kept for parity; typed for
 * the native window event.)
 */
export function useParallax() {
  const [v, setV] = useState({ x: 0, y: 0 });
  const onMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    setV({ x, y });
  }, []);
  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [onMove]);
  return v;
}

/** Random hex generator for generating/hash sequences. */
export function randomHex(len: number) {
  return Array.from({ length: len }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
}
