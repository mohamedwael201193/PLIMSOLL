"use client";

import { useEffect, useState } from "react";
import { Activity, Radio } from "lucide-react";

import { ASSETS } from "@/lib/capacity";
import { getTickers } from "@/lib/oregon";

interface TickerRow {
  symbol: string;
  last: number;
  change: number;
  quoteVolume: number;
}

interface MarketData {
  rows: TickerRow[];
  classification: "LIVE" | "UNKNOWN";
  capturedAt: number;
}

const fmt = (n: number): string =>
  n >= 1000
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : n >= 10
      ? n.toFixed(2)
      : n.toFixed(4);

const fmtVol = (n: number): string => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
};

/**
 * LIVE/SIMULATED market strip — a nod to the real Plimsoll desk:
 * the ARKUSDT strip is a live snapshot, never a mock pretending to be live.
 */
export default function MarketStrip() {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const json = await getTickers(ASSETS.map((a) => a.symbol));
        if (!cancelled) {
          setData({
            rows: json.rows,
            classification: json.classification === "LIVE" ? "LIVE" : "UNKNOWN",
            capturedAt: Date.parse(json.captured_at || "") || Date.now(),
          });
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const live = data?.classification === "LIVE";

  return (
    <div className="border-b border-plimsoll/15 bg-plimsoll-black/80 backdrop-blur-sm">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="flex items-stretch gap-0 overflow-x-auto scroll-thin font-code text-[10px] sm:text-[11px] tracking-[0.12em]">
          <div className="flex items-center gap-2 pr-4 py-2 shrink-0 text-plimsoll">
            {live ? <Radio className="w-3.5 h-3.5 pulse-gold rounded-full" aria-hidden /> : <Activity className="w-3.5 h-3.5" aria-hidden />}
            <span className={live ? "text-plimsoll" : "text-plimsoll/70"}>
              {data ? (live ? "LIVE" : "UNKNOWN") : "LOADING FEED"}
            </span>
          </div>

          {error && (
            <span className="flex items-center px-4 py-2 text-plimsoll/60">
              FEED UNREACHABLE — NO INVENTED PRICES
            </span>
          )}

          {data?.rows.map((r, i) => (
            <div
              key={r.symbol}
              className="flex items-center gap-2 px-4 py-2 border-l border-plimsoll/10 shrink-0 ticker-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="text-plimsoll/80">{r.symbol.replace("USDT", "")}/USDT</span>
              <span className="text-white/90">{fmt(r.last)}</span>
              <span className={r.change >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change).toFixed(2)}%
              </span>
              <span className="text-plimsoll/40 hidden lg:inline">24QV {fmtVol(r.quoteVolume)}</span>
            </div>
          ))}

          <div className="ml-auto hidden xl:flex items-center gap-6 pl-6 text-plimsoll/40 shrink-0">
            <span>SPOT FILTERS: OK</span>
            <span>WRITES: OFF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
