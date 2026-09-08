"use client";

import { motion } from "framer-motion";
import { DiamondMark } from "./DiamondMark";

export type RouteName = "/" | "/app" | "/portfolio" | "/agents" | "/docs" | "/docs/mcp" | "/settings";

interface Props {
  glitch: boolean;
  route: RouteName;
  live: boolean;
  connected: boolean;
}

const NAV: { label: string; route: RouteName }[] = [
  { label: "CAPACITY", route: "/app" },
  { label: "PORTFOLIO", route: "/portfolio" },
  { label: "AGENTS", route: "/agents" },
  { label: "DOCS", route: "/docs" },
  { label: "MCP", route: "/docs/mcp" },
];

export default function Header({ glitch, route, live, connected }: Props) {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1], delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-40 bg-plimsoll-black/85 backdrop-blur-sm border-b border-plimsoll/15"
    >
      <div
        className={`mx-auto max-w-[1600px] flex items-center justify-between gap-4 px-4 sm:px-6 py-3 ${
          glitch ? "glitch-on" : ""
        }`}
      >
        <a
          href="#/"
          className="flex items-center gap-2 font-code text-[11px] sm:text-xs tracking-[0.22em] text-plimsoll hover:text-white transition-colors shrink-0"
          aria-label="Plimsoll home"
        >
          <DiamondMark className="w-4 h-4 spin-slow" />
          <span className="glitch-text" data-text="PLIMSOLL">
            PLIMSOLL
          </span>
        </a>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1 font-code text-[10px] sm:text-[11px] tracking-[0.18em] overflow-x-auto scroll-thin">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={`#${n.route}`}
              aria-current={route === n.route ? "page" : undefined}
              className={`px-3 py-1.5 border transition-colors ${
                route === n.route
                  ? "border-plimsoll bg-plimsoll text-plimsoll-black"
                  : "border-transparent text-plimsoll/70 hover:text-plimsoll hover:border-plimsoll/40"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 font-code text-[9px] sm:text-[10px] tracking-[0.2em] shrink-0">
          <span className={live ? "text-emerald-400" : "text-plimsoll/70"}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${live ? "bg-emerald-400 pulse-gold" : "bg-plimsoll/40"}`} />
            {live ? "LIVE" : "NO FEED"}
          </span>
          <a
            href="#/settings"
            className={`hidden sm:inline px-2 py-0.5 border transition-colors ${
              connected
                ? "border-plimsoll text-plimsoll bg-plimsoll/10"
                : "text-plimsoll/60 hover:text-plimsoll border-plimsoll/30"
            }`}
          >
            {connected ? "AGENT CONNECTED" : "PUBLIC MODE"}
          </a>
          <a
            href="#/settings"
            className="hidden sm:inline text-plimsoll/60 hover:text-plimsoll border border-plimsoll/30 px-2 py-0.5 transition-colors"
          >
            SETTINGS
          </a>
        </div>
      </div>

      {/* mobile nav */}
      <nav aria-label="Primary mobile" className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto scroll-thin font-code text-[9px] tracking-[0.15em]">
        {NAV.map((n) => (
          <a
            key={n.route}
            href={`#${n.route}`}
            aria-current={route === n.route ? "page" : undefined}
            className={`px-3 py-1.5 border shrink-0 transition-colors ${
              route === n.route
                ? "border-plimsoll bg-plimsoll text-plimsoll-black"
                : "border-plimsoll/25 text-plimsoll/70"
            }`}
          >
            {n.label}
          </a>
        ))}
      </nav>
    </motion.header>
  );
}
