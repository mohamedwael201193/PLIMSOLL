"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CustomCursor from "@/components/plimsoll/CustomCursor";
import ExperienceWarning from "@/components/plimsoll/ExperienceWarning";
import Preloader from "@/components/plimsoll/Preloader";
import Header from "@/components/plimsoll/Header";
import MarketStrip from "@/components/plimsoll/MarketStrip";
import Footer from "@/components/plimsoll/Footer";
import Landing from "@/components/plimsoll/landing/Landing";
import Desk from "@/components/plimsoll/desk/Desk";
import Portfolio from "@/components/plimsoll/desk/Portfolio";
import PositionDetail from "@/components/plimsoll/desk/PositionDetail";
import AgentsGallery from "@/components/plimsoll/AgentsGallery";
import DocsPage from "@/components/plimsoll/docs/DocsPage";
import McpPage from "@/components/plimsoll/docs/McpPage";
import SettingsPage from "@/components/plimsoll/docs/SettingsPage";
import { getAccount, getTickers } from "@/lib/oregon";

type Stage = "warning" | "loading" | "site";
type Mode = "safe" | "glitch";

interface ParsedRoute {
  path: string;
  symbol?: string;
}

const KNOWN_ROUTES = ["/", "/app", "/portfolio", "/agents", "/docs", "/docs/mcp", "/settings"];

function parseHash(): ParsedRoute {
  if (typeof window === "undefined") return { path: "/" };
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const path = raw.split("?")[0].replace(/\/+$/, "") || "/";
  if (path.startsWith("/position/")) {
    const symbol = path.slice("/position/".length).toUpperCase();
    if (symbol) return { path: "/position", symbol };
  }
  if (KNOWN_ROUTES.includes(path)) return { path };
  return { path: "/" };
}

export default function Page() {
  const [stage, setStage] = useState<Stage>("warning");
  const [mode, setMode] = useState<Mode>("glitch");
  const [route, setRoute] = useState<ParsedRoute>({ path: "/" });
  const [live, setLive] = useState(false);
  const [connected, setConnected] = useState(false);

  const choose = useCallback((m: Mode) => {
    setMode(m);
    setStage("loading");
  }, []);

  // constitution settings can request safe mode permanently (persisted choice)
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem("plimsoll-safe-mode") === "1") {
          setMode("safe");
          setStage("site");
        }
      } catch {
        /* storage unavailable — keep the standard gate */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // hash routing
  useEffect(() => {
    const onHash = () => {
      const next = parseHash();
      setRoute((prev) => {
        if (prev.path !== next.path || prev.symbol !== next.symbol) {
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          return next;
        }
        return prev;
      });
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // lock scroll during warning / loading
  useEffect(() => {
    if (stage === "site") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [stage]);

  // single market poll for the header LIVE badge + account chip
  useEffect(() => {
    if (stage !== "site") return;
    let cancelled = false;
    const load = async () => {
      try {
        const json = await getTickers(["ARKUSDT", "BTCUSDT", "ETHUSDT"]);
        if (!cancelled) setLive(json.classification === "LIVE");
      } catch {
        /* header badge is best-effort */
      }
      try {
        const acct = await getAccount();
        if (!cancelled) setConnected(Boolean(acct.connected));
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stage]);

  const glitch = mode === "glitch" && stage === "site";

  const activeNav =
    route.path === "/position"
      ? "/app"
      : (route.path as "/app" | "/portfolio" | "/agents" | "/docs" | "/docs/mcp" | "/settings" | "/");

  return (
    <div className="min-h-screen flex flex-col bg-plimsoll-deep">
      <CustomCursor />

      <AnimatePresence mode="wait">
        {stage === "warning" && <ExperienceWarning key="warning" onChoose={choose} />}
        {stage === "loading" && (
          <Preloader key="loading" glitch={mode === "glitch"} onComplete={() => setStage("site")} />
        )}
      </AnimatePresence>

      {stage === "site" && (
        <>
          <Header glitch={glitch} route={activeNav} live={live} connected={connected} />
          <MarketStrip />
          <AnimatePresence mode="wait">
            <motion.div
              key={route.path + (route.symbol ?? "")}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
              className="flex flex-col flex-1"
            >
              {route.path === "/" && <Landing glitch={glitch} />}
              {route.path === "/app" && <Desk glitch={glitch} symbol={route.symbol} />}
              {route.path === "/portfolio" && <Portfolio glitch={glitch} />}
              {route.path === "/position" && route.symbol && <PositionDetail glitch={glitch} symbol={route.symbol} />}
              {route.path === "/agents" && <AgentsGallery glitch={glitch} />}
              {route.path === "/docs" && <DocsPage glitch={glitch} />}
              {route.path === "/docs/mcp" && <McpPage glitch={glitch} />}
              {route.path === "/settings" && <SettingsPage glitch={glitch} />}
            </motion.div>
          </AnimatePresence>
          <Footer glitch={glitch} />
          {glitch && <div className="crt-overlay" aria-hidden />}
        </>
      )}
    </div>
  );
}
