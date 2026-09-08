"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CustomCursor from "@/components/plimsoll/CustomCursor";
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

function motionReduced(): boolean {
  try {
    if (window.localStorage.getItem("plimsoll-safe-mode") === "1") return true;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Page() {
  const [reduce, setReduce] = useState(false);
  const [route, setRoute] = useState<ParsedRoute>({ path: "/" });
  const [live, setLive] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apply = () => setReduce(motionReduced());
    apply();
    window.addEventListener("plimsoll-motion", apply);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", apply);
    return () => {
      window.removeEventListener("plimsoll-motion", apply);
      mq.removeEventListener("change", apply);
    };
  }, []);

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

  useEffect(() => {
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
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const glitch = !reduce;
  const activeNav =
    route.path === "/position"
      ? "/app"
      : (route.path as "/app" | "/portfolio" | "/agents" | "/docs" | "/docs/mcp" | "/settings" | "/");

  return (
    <div className="min-h-screen flex flex-col bg-plimsoll-deep">
      {glitch && <CustomCursor />}
      <Header glitch={glitch} route={activeNav} live={live} connected={connected} />
      <MarketStrip />
      <AnimatePresence mode="wait">
        <motion.div
          key={route.path + (route.symbol ?? "")}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: [0.19, 1, 0.22, 1] }}
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
    </div>
  );
}
