"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Reticle cursor: gold crosshair that follows the pointer,
 * expands over interactive elements. Desktop only.
 */
export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;
    document.body.classList.add("cursor-none-desktop");

    const onMove = (e: MouseEvent) => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
        setVisible(true);
        const el = e.target as HTMLElement | null;
        setHovering(
          !!el?.closest("a, button, [role='button'], input, select, textarea, [data-cursor]")
        );
      });
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.body.classList.remove("cursor-none-desktop");
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const size = hovering ? 56 : 38;
  const half = size / 2;

  return (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none z-[9999] transition-[width,height,opacity] duration-150 hidden md:block"
      style={{
        left: pos.x - half,
        top: pos.y - half,
        width: size,
        height: size,
        opacity: visible ? 1 : 0,
      }}
    >
      <svg viewBox="0 0 56 56" width={size} height={size} fill="none">
        <circle
          cx="28"
          cy="28"
          r="20"
          stroke="#FCD535"
          strokeWidth="1.5"
          className={hovering ? "opacity-100" : "opacity-70"}
        />
        <path d="M28 0v14M28 42v14M0 28h14M42 28h14" stroke="#FCD535" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="2.5" fill="#FCD535" />
        {hovering && (
          <path d="M28 10 L46 28 L28 46 L10 28 Z" stroke="#FCD535" strokeWidth="1.5" fill="rgba(252,213,53,0.12)" />
        )}
      </svg>
    </div>
  );
}
