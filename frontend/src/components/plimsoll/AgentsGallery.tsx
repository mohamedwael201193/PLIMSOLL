"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { AGENTS, AGENT_LOOP, type AgentRole } from "@/lib/agents";
import { Corners, reveal, focusGold, BEZIER } from "./landing/shared";

interface Props {
  glitch: boolean;
}

const INTRO =
  "Financial intelligence entities — not mascots. Each role maps to a stage of the agent loop.";

/** Loop duty — what each entity contributes to the 8-step spine. */
const LOOP_DUTY: Record<string, string> = {
  scout:
    "Runs OBSERVE — step 01 of 08. Every downstream number is computed from the snapshot the scout hands over, and a stale snapshot is never handed over at all.",
  cartographer:
    "Runs UNDERSTAND — step 02 of 08. Turns the walked bid book into the capacity line that PLAN, DECIDE and every later step must obey.",
  executor:
    "Runs ACT — step 06 of 08. The only hands in the system, and they stay closed until ASK (step 05) has cleared the operator's CONFIRM.",
  watcher:
    "Runs ADAPT — step 08 of 08. Re-solves the held position against every new snapshot and proposes the trim — the sell decision itself stays yours.",
  auditor:
    "Runs VERIFY — step 07 of 08. Closes each pass with order read-back and balance reconciliation, so ADAPT starts from evidence instead of hope.",
};

/** Which entity owns each loop step on the full-width rail. */
const STEP_OWNER: Record<string, { owner: string; crew: boolean }> = {
  OBSERVE: { owner: "SCOUT", crew: true },
  UNDERSTAND: { owner: "CARTOGRAPHER", crew: true },
  PLAN: { owner: "DESK CORE", crew: false },
  DECIDE: { owner: "DESK CORE", crew: false },
  ASK: { owner: "OPERATOR", crew: false },
  ACT: { owner: "EXECUTOR", crew: true },
  VERIFY: { owner: "AUDITOR", crew: true },
  ADAPT: { owner: "WATCHER", crew: true },
};

export default function AgentsGallery({ glitch }: Props) {
  const [active, setActive] = useState<AgentRole | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const open = (agent: AgentRole, card: HTMLButtonElement) => {
    triggerRef.current = card;
    setActive(agent);
  };

  // scroll lock + escape + focus management while the dossier is open
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
    <main
      id="agents"
      className={`grid-dark-dense noise scanlines relative overflow-hidden pt-28 sm:pt-32 pb-16 ${glitch ? "glitch-on" : ""}`}
      aria-label="The crew — agent characters"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        {/* top meta row */}
        <div className="flex justify-between items-center font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-plimsoll/60">
          <span>CREW_MANIFEST</span>
          <span className="hidden sm:inline">FIVE ROLES · ONE SPINE</span>
          <span>05 / 05</span>
        </div>

        {/* header */}
        <header className="mt-4">
          <span className="font-code text-[10px] tracking-[0.3em] text-plimsoll/60">
            [ AGENT_CHARACTERS — FIVE ROLES, ONE SPINE ]
          </span>
          <h1 className="font-display section-word mt-4 text-white">
            THE <span className="text-outline-gold">CREW</span>
          </h1>
          <motion.p
            {...reveal(0.1)}
            className="mt-5 font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/60 max-w-lg"
          >
            {INTRO}
          </motion.p>
        </header>

        {/* the five entities */}
        <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {AGENTS.map((agent, i) => (
            <motion.button
              key={agent.id}
              type="button"
              {...reveal(0.05 + i * 0.07)}
              onClick={(e) => open(agent, e.currentTarget)}
              aria-haspopup="dialog"
              aria-label={`${agent.name}, ${agent.role} — open dossier`}
              className={`group scan-sweep w-full text-left ${focusGold}`}
            >
              {/* entity image — flat deep bg, sits seamless on the grid */}
              <div className="overflow-hidden">
                <img
                  src={agent.image}
                  alt={`${agent.name} — ${agent.role.toLowerCase()} entity portrait`}
                  className="w-full h-auto transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-[1.04]"
                  draggable={false}
                  loading="lazy"
                />
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-lg sm:text-xl text-white group-hover:text-plimsoll transition-colors">
                    {agent.name}
                  </h2>
                  <div className="font-code text-[10px] tracking-[0.25em] text-plimsoll mt-1">
                    {agent.role}
                  </div>
                </div>
                <span className="font-code text-[9px] tracking-[0.15em] text-white/25 pt-1 shrink-0">
                  {String(i + 1).padStart(2, "0")}/05
                </span>
              </div>

              <p className="mt-3 font-grotesk text-[13px] leading-relaxed text-white/60">
                {agent.line}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="font-code text-[9px] tracking-[0.15em] border border-plimsoll/40 text-plimsoll/80 px-2 py-1">
                  LOOP STAGE · {agent.loop}
                </span>
                <span className="font-code text-[9px] tracking-[0.2em] text-plimsoll/40 group-hover:text-plimsoll transition-colors inline-flex items-center gap-1.5">
                  OPEN DOSSIER
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* the full-width agent loop rail */}
        <section aria-label="The agent loop — eight steps" className="mt-20 sm:mt-28 border-t border-plimsoll/15 pt-10">
          <div className="flex flex-wrap justify-between items-baseline gap-2 font-code text-[9px] sm:text-[10px] tracking-[0.3em] text-plimsoll/60 mb-6">
            <span>[ AGENT_LOOP — OBSERVE → ADAPT ]</span>
            <span className="hidden sm:inline">08 STEPS · 05 CREW · 01 OPERATOR</span>
          </div>

          <div className="overflow-x-auto scroll-thin pb-2">
            <ol className="flex items-stretch min-w-max">
              {AGENT_LOOP.map((step, i) => {
                const meta = STEP_OWNER[step];
                return (
                  <li key={step} className="flex items-stretch">
                    <div
                      className={`flex flex-col gap-1 px-4 sm:px-5 py-3 border ${
                        meta.crew
                          ? "border-plimsoll/50 text-plimsoll"
                          : step === "ASK"
                            ? "border-dashed border-white/25 text-white/45"
                            : "border-white/15 text-white/45"
                      }`}
                    >
                      <span className="font-code text-[8px] tracking-[0.2em] opacity-60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-code text-[11px] sm:text-xs tracking-[0.2em]">
                        {step}
                      </span>
                      <span className="font-code text-[8px] tracking-[0.12em] opacity-70">
                        {meta.owner}
                      </span>
                    </div>
                    {i < AGENT_LOOP.length - 1 && (
                      <span aria-hidden className="flex items-center px-1">
                        <span className="h-px w-3 sm:w-6 bg-plimsoll/50" />
                        <span className="font-code text-[9px] text-plimsoll">▸</span>
                        <span className="h-px w-3 sm:w-6 bg-plimsoll/50" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="mt-5 font-code text-[8px] sm:text-[9px] tracking-[0.2em] text-white/35 max-w-2xl leading-relaxed">
            PLAN, DECIDE AND ASK ARE THE DESK AND THE OPERATOR — THE HUMAN GATE. EVERY OTHER
            STEP BELONGS TO A NAMED MEMBER OF THE CREW.
          </p>
        </section>
      </div>

      {/* ── dossier overlay ── */}
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
              aria-label="Close dossier"
              onClick={() => setActive(null)}
              className="absolute inset-0 bg-plimsoll-black/90 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dossier-title"
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
                aria-label="Close dossier"
                className={`absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center border border-plimsoll/40 text-plimsoll hover:bg-plimsoll hover:text-plimsoll-black transition-colors ${focusGold}`}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>

              <div className="relative z-10 grid sm:grid-cols-[230px_minmax(0,1fr)] gap-6 p-5 sm:p-8">
                <div className="entity-card max-w-[230px] mx-auto sm:mx-0">
                  <img
                    src={active.image}
                    alt={`${active.name} entity portrait`}
                    className="w-full h-auto"
                    draggable={false}
                  />
                </div>

                <div className="min-w-0">
                  <div className="font-code text-[9px] tracking-[0.3em] text-plimsoll/60">
                    [ {String(active.loopIndex + 1).padStart(2, "0")}/08 — {active.role} ]
                  </div>
                  <h3 id="dossier-title" className="font-display text-2xl sm:text-3xl text-plimsoll mt-2">
                    {active.name}
                  </h3>
                  <p className="font-grotesk text-[13px] sm:text-[14px] leading-relaxed text-white/70 mt-4">
                    {active.description}
                  </p>

                  {/* loop position — mini rail with this step highlighted */}
                  <div className="mt-5 font-code text-[9px] tracking-[0.25em] text-plimsoll/60">
                    LOOP POSITION — WHERE IT SITS IN THE SPINE
                  </div>
                  <div className="mt-2 border-l border-plimsoll/20">
                    {AGENT_LOOP.map((step, i) => (
                      <div
                        key={step}
                        className="relative pl-4 py-1 flex items-center gap-2 font-code text-[9px] tracking-[0.15em]"
                      >
                        {i === active.loopIndex && (
                          <span
                            aria-hidden
                            className="absolute left-[-3.5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-plimsoll"
                          />
                        )}
                        <span className={i === active.loopIndex ? "text-plimsoll" : "text-white/30"}>
                          {String(i + 1).padStart(2, "0")} {step}
                        </span>
                        {i === active.loopIndex && (
                          <span className="ml-auto text-plimsoll/60 text-[8px]">◂ HERE</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* tags */}
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

                  {/* loop duty */}
                  <div className="mt-5 font-code text-[9px] tracking-[0.25em] text-plimsoll/60">
                    CONNECTION — LOOP DUTY
                  </div>
                  <p className="mt-2 border-l-2 border-plimsoll/60 pl-3 font-grotesk text-[12px] sm:text-[13px] leading-relaxed text-plimsoll/80">
                    {LOOP_DUTY[active.id] ?? active.line}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
