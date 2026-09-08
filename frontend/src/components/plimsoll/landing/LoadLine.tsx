"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { BIG_ENTITY } from "@/lib/agents";
import { DEFAULT_CONSTRAINTS } from "@/lib/capacity";
import { intentText, postIntent } from "@/lib/oregon";
import { Corners, SectionLabel, reveal, BEZIER, fmtUsdFull } from "./shared";

interface Props {
  glitch: boolean;
}

const ASKED = 10_000;

const DRAFT_MARKS = [
  { label: "TF", at: 90 },
  { label: "F", at: 74 },
  { label: "T", at: 58 },
  { label: "S", at: 42 },
  { label: "W", at: 26 },
  { label: "WNA", at: 10 },
];

const CHIPS = [
  {
    title: "COST CAPACITY",
    line: "How much can exit before impact + fees cross your budget.",
    foot: "DRIVEN BY THE BOOK",
  },
  {
    title: "TIME CAPACITY",
    line: "Participation × volume that fits inside your horizon.",
    foot: "DRIVEN BY THE TAPE",
  },
  {
    title: "BINDING CONSTRAINT",
    line: "The lower of the two. That is the line itself.",
    foot: "DRIVEN BY MATH",
  },
];

export default function LoadLine({ glitch }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [exposureIdx, setExposureIdx] = useState(0);
  const [lineUsd, setLineUsd] = useState<number | null>(null);
  const [cls, setCls] = useState("UNKNOWN");

  useEffect(() => {
    let alive = true;
    postIntent(intentText({ ...DEFAULT_CONSTRAINTS, targetNotional: ASKED }), {
      ...DEFAULT_CONSTRAINTS,
      targetNotional: ASKED,
    })
      .then((r) => {
        if (!alive) return;
        setCls(r.mapped.classification);
        setLineUsd(r.mapped.exitCapacity > 0 ? r.mapped.exitCapacity : null);
      })
      .catch(() => {
        if (!alive) return;
        setCls("UNKNOWN");
        setLineUsd(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setExposureIdx((i) => (i + 1) % 2), 4200);
    return () => clearInterval(id);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const entityY = useTransform(scrollYProgress, [0, 1], [70, -70]);

  const exposures = lineUsd != null ? [Math.max(0, Math.round(lineUsd * 0.82)), ASKED] : [0, 0];
  const scaleMax = Math.max(8000, ASKED, lineUsd ?? 0);
  const linePct = lineUsd != null ? (lineUsd / scaleMax) * 100 : 0;
  const exposureUsd = exposures[exposureIdx];
  const exposurePct = scaleMax > 0 ? (exposureUsd / scaleMax) * 100 : 0;
  const over = lineUsd != null && exposurePct > linePct;
  const overPct = over ? exposurePct - linePct : 0;
  const instrumentStatus =
    lineUsd == null ? "AWAITING LIVE LINE" : over ? "OVER CAPACITY" : "WITHIN CAPACITY";

  return (
    <section
      ref={sectionRef}
      className={`relative grid-crosshair overflow-hidden py-20 sm:py-28 ${glitch ? "glitch-on" : ""}`}
      aria-label="The Plimsoll line instrument"
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <SectionLabel index="02" name="THE INSTRUMENT" />
        <h2 className="font-display section-word mt-4 text-white">
          THE <span className="text-outline-gold">PLIMSOLL</span> LINE
        </h2>

        <div className="mt-10 sm:mt-14 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-6 items-center">
          {/* ── the instrument ── */}
          <motion.div
            {...reveal()}
            className="corner-frame-4 text-plimsoll border border-plimsoll/30 bg-plimsoll-black/70 backdrop-blur-sm relative"
          >
            <Corners tone="gold" />

            <AnimatePresence>
              {over && (
                <motion.span
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -inset-[3px] border-2 border-plimsoll pulse-gold pointer-events-none z-20"
                />
              )}
            </AnimatePresence>

            {/* instrument header */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 font-code text-[9px] sm:text-[10px] tracking-[0.25em]">
              <span className="text-plimsoll/60">
                LOAD LINE · {cls}
                {lineUsd == null ? "" : " · EXPOSURE ILLUSTRATION"}
              </span>
              <span
                className={`transition-colors duration-300 ${
                  over ? "text-rose-400" : "text-plimsoll"
                }`}
                role="status"
              >
                <span className="blink" aria-hidden>
                  ◆
                </span>{" "}
                {instrumentStatus}
              </span>
            </div>

            {/* instrument body */}
            <div className="relative m-4 sm:m-6 mt-3 h-[340px] sm:h-[400px] overflow-hidden">
              {/* faint level grid */}
              {[20, 40, 60, 80].map((p) => (
                <span
                  key={p}
                  aria-hidden
                  className="absolute left-0 right-0 h-px bg-white/[0.06]"
                  style={{ top: `${100 - p}%` }}
                />
              ))}

              {/* the vessel — vertical draft gauge */}
              <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 border border-plimsoll/25 bg-plimsoll-black/70">
                {/* draft marks */}
                {DRAFT_MARKS.map((m) => (
                  <span
                    key={m.label}
                    aria-hidden
                    className="absolute right-0 flex items-center gap-1"
                    style={{ top: `${100 - m.at}%`, transform: "translateY(-50%)" }}
                  >
                    <span className="font-code text-[7px] sm:text-[8px] text-plimsoll/50 mr-1">
                      {m.label}
                    </span>
                    <span className="block h-px bg-plimsoll/40" style={{ width: m.label === "S" ? 22 : 12 }} />
                  </span>
                ))}
                {/* fill */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-plimsoll/60 to-plimsoll/95"
                  animate={{ height: `${exposurePct}%` }}
                  transition={{ duration: 1.6, ease: BEZIER }}
                >
                  <span aria-hidden className="absolute top-0 left-0 right-0 h-[2px] bg-plimsoll" />
                </motion.div>
                {/* over-capacity hatch above the line */}
                {over && (
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-0 right-0 bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_4px,rgba(255,92,92,0.35)_4px,rgba(255,92,92,0.35)_5px)]"
                    style={{ bottom: `${linePct}%`, height: `${overPct}%` }}
                  />
                )}
              </div>

              {/* exposure marker — rides the fill top */}
              <motion.div
                className="absolute left-12 sm:left-14 right-0 flex items-center gap-2"
                animate={{ bottom: `${exposurePct}%` }}
                transition={{ duration: 1.6, ease: BEZIER }}
                style={{ transform: "translateY(50%)" }}
              >
                <span aria-hidden className="flex-1 h-px bg-white/40 border-t border-dashed border-white/50" />
                <span
                  className="font-code text-[8px] sm:text-[9px] tracking-[0.18em] whitespace-nowrap px-1.5 py-0.5 bg-plimsoll-black/85 border border-white/20"
                  style={{ color: over ? "#FDA4AF" : "rgba(238,241,246,0.85)" }}
                >
                  {exposureIdx === 1 ? "ASKED" : "WITHIN"} {fmtUsdFull(exposureUsd)}
                </span>
              </motion.div>

              {/* the load line — drifts as the market moves */}
              <motion.div
                className="absolute left-12 sm:left-14 right-0 flex items-center"
                style={{ top: `${100 - linePct}%`, transform: "translateY(-50%)" }}
                animate={{ x: [-10, 10, -10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <span
                  aria-hidden
                  className="flex-1 h-[2px] bg-plimsoll"
                  style={{ boxShadow: "0 0 10px rgba(252,213,53,0.6)" }}
                />
                {/* the ring — classic load-line mark */}
                <span
                  aria-hidden
                  className="w-5 h-5 rounded-full border-2 border-plimsoll bg-plimsoll-black/60 shrink-0 -ml-3"
                />
                <span className="font-code text-[8px] sm:text-[9px] tracking-[0.18em] text-plimsoll whitespace-nowrap ml-2">
                  LOAD LINE · {lineUsd != null ? fmtUsdFull(lineUsd) : "—"}
                </span>
              </motion.div>
            </div>

            {/* scale */}
            <div className="flex justify-between px-4 sm:px-6 pb-4 font-code text-[8px] sm:text-[9px] tracking-[0.15em] text-plimsoll/40">
              <span>$0</span>
              <span>{fmtUsdFull(scaleMax * 0.25)}</span>
              <span>{fmtUsdFull(scaleMax * 0.5)}</span>
              <span>{fmtUsdFull(scaleMax * 0.75)}</span>
              <span>{fmtUsdFull(scaleMax)}</span>
            </div>
          </motion.div>

          {/* ── the entity beam — right visual, parallax ── */}
          <motion.div style={{ y: entityY }} className="relative min-w-0">
            <motion.img
              src={BIG_ENTITY}
              alt="The entity — its plumb-line beam marks the load line"
              draggable={false}
              loading="lazy"
              className="w-full h-auto max-w-[560px] mx-auto drop-shadow-[0_30px_70px_rgba(6,7,12,0.85)]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 1, ease: BEZIER }}
            />
            <div className="mt-2 font-code text-[9px] tracking-[0.25em] text-plimsoll/50 text-center">
              THE BEAM IS THE LINE · IT DRIFTS AS THE BOOK THINS
            </div>
          </motion.div>
        </div>

        {/* caption */}
        <motion.div {...reveal(0.1)} className="mt-14 sm:mt-16 flex items-center gap-4">
          <span className="ticks flex-1 h-3 text-plimsoll/25" aria-hidden />
          <span className="font-display text-sm sm:text-lg tracking-[0.06em] text-white whitespace-nowrap">
            THE LINE MOVES WHEN THE MARKET MOVES.
          </span>
          <span className="ticks flex-1 h-3 text-plimsoll/25" aria-hidden />
        </motion.div>

        {/* stat chips */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {CHIPS.map((c, i) => (
            <motion.div
              key={c.title}
              {...reveal(0.1 + i * 0.08)}
              className="border border-plimsoll/25 bg-plimsoll-black/50 p-4 sm:p-5 hover:border-plimsoll/50 transition-colors"
            >
              <div className="font-code text-[10px] tracking-[0.25em] text-plimsoll">{c.title}</div>
              <p className="font-grotesk text-[12px] leading-relaxed text-white/60 mt-2">{c.line}</p>
              <div className="font-code text-[8px] tracking-[0.2em] text-plimsoll/40 mt-3">{c.foot}</div>
            </motion.div>
          ))}
        </div>

        {/* legend */}
        <motion.div
          {...reveal(0.2)}
          className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 font-code text-[9px] sm:text-[10px] tracking-[0.25em] text-white/40"
        >
          <span>THE MARKET IS THE SEA</span>
          <span className="text-plimsoll" aria-hidden>
            ·
          </span>
          <span>EXPOSURE IS THE VESSEL</span>
          <span className="text-plimsoll" aria-hidden>
            ·
          </span>
          <span>CAPACITY IS THE LOAD LINE</span>
        </motion.div>
      </div>
    </section>
  );
}
