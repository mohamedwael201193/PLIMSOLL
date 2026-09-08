"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AGENTS, AGENT_LOOP, type AgentRole } from "@/lib/agents";
import { Corners, SectionLabel, reveal, focusGold, BEZIER } from "./shared";

interface Props {
  glitch: boolean;
}

export default function AgentCharacters({ glitch }: Props) {
  const [active, setActive] = useState<AgentRole | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const open = (agent: AgentRole, card: HTMLButtonElement) => {
    triggerRef.current = card;
    setActive(agent);
  };

  // scroll lock + escape + focus management while the overlay is open
  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [active]);

  return (
    <section
      className={`relative bg-plimsoll-deep noise overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="The crew — agent entities"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="10" name="THE CREW" />
        <h2 className="font-display section-word mt-4 text-white">
          THE <span className="text-outline-gold">CREW</span>
        </h2>
        <motion.p {...reveal(0.1)} className="mt-5 font-grotesk text-[13px] sm:text-[15px] text-white/60 max-w-lg">
          Five entities, one loop. Each character is a real product function with a face —
          select one to see exactly where it sits in the spine.
        </motion.p>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {AGENTS.map((agent, i) => (
            <motion.button
              key={agent.id}
              type="button"
              {...reveal(0.05 + i * 0.07)}
              onClick={(e) => open(agent, e.currentTarget)}
              aria-haspopup="dialog"
              aria-label={`${agent.name}, ${agent.role} — open detail`}
              className={`group text-left border border-plimsoll/20 hover:border-plimsoll/60 p-3 pb-4 transition-colors ${focusGold}`}
            >
              <div className="entity-card">
                <img
                  src={agent.image}
                  alt={`${agent.name} — ${agent.role.toLowerCase()}`}
                  className="w-full h-auto"
                  draggable={false}
                  loading="lazy"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="font-code text-[11px] sm:text-xs tracking-[0.2em] text-plimsoll">{agent.name}</span>
                <span className="font-code text-[8px] text-plimsoll/30">{String(i + 1).padStart(2, "0")}/05</span>
              </div>
              <div className="font-code text-[8px] tracking-[0.2em] text-white/40 mt-1">{agent.role}</div>
              <p className="font-grotesk text-[11px] text-white/50 mt-2 leading-snug">{agent.line}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-code text-[8px] tracking-[0.15em] border border-plimsoll/30 text-plimsoll/70 px-1.5 py-0.5">
                  {agent.loop}
                </span>
                <span className="font-code text-[8px] tracking-[0.15em] text-plimsoll/40 group-hover:text-plimsoll transition-colors">
                  OPEN ▸
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── detail overlay ── */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              aria-label="Close detail"
              onClick={() => setActive(null)}
              className="absolute inset-0 bg-plimsoll-black/90 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="crew-detail-title"
              tabIndex={-1}
              initial={{ opacity: 0, y: 36, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: BEZIER }}
              className="corner-frame-4 text-plimsoll relative w-full max-w-3xl max-h-[90vh] overflow-y-auto scroll-thin bg-plimsoll-deep border border-plimsoll/30"
            >
              <Corners tone="gold" />

              <button
                ref={closeRef}
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close detail"
                className={`absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center border border-plimsoll/40 text-plimsoll hover:bg-plimsoll hover:text-plimsoll-black transition-colors ${focusGold}`}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>

              <div className="relative z-10 grid sm:grid-cols-[220px_minmax(0,1fr)] gap-6 p-5 sm:p-8">
                <div className="entity-card max-w-[220px] mx-auto sm:mx-0">
                  <img
                    src={active.image}
                    alt={`${active.name} entity`}
                    className="w-full h-auto"
                    draggable={false}
                  />
                </div>

                <div className="min-w-0">
                  <div className="font-code text-[9px] tracking-[0.3em] text-plimsoll/60">
                    [ {String(active.loopIndex + 1).padStart(2, "0")} — {active.role} ]
                  </div>
                  <h3 id="crew-detail-title" className="font-display text-2xl sm:text-3xl text-plimsoll mt-2">
                    {active.name}
                  </h3>
                  <p className="font-grotesk text-[13px] sm:text-[14px] leading-relaxed text-white/70 mt-4">
                    {active.description}
                  </p>

                  <div className="mt-5 font-code text-[9px] tracking-[0.25em] text-plimsoll/60">TAGS</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {active.tags.map((t) => (
                      <span
                        key={t}
                        className="font-code text-[8px] sm:text-[9px] tracking-[0.15em] border border-plimsoll/30 text-plimsoll/70 px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 font-code text-[9px] tracking-[0.25em] text-plimsoll/60">
                    LOOP CONNECTION — {active.loop} · {String(active.loopIndex + 1).padStart(2, "0")}/08
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {AGENT_LOOP.map((step, i) => (
                      <span
                        key={step}
                        className={`font-code text-[7px] sm:text-[8px] tracking-[0.12em] px-1.5 py-1 ${
                          i === active.loopIndex
                            ? "bg-plimsoll text-plimsoll-black"
                            : "border border-white/10 text-white/40"
                        }`}
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
