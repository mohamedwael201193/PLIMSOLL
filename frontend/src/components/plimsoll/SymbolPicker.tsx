"use client";

import { useEffect, useState } from "react";
import { ASSETS, normalizeSpotSymbol } from "@/lib/capacity";
import { getSymbols } from "@/lib/oregon";
import { focusGold } from "./landing/shared";

interface Props {
  symbol: string;
  onSelect: (symbol: string) => void;
  compact?: boolean;
}

export default function SymbolPicker({ symbol, onSelect, compact }: Props) {
  const [typed, setTyped] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [cls, setCls] = useState<string>("UNKNOWN");

  useEffect(() => {
    let alive = true;
    getSymbols()
      .then((body) => {
        if (!alive) return;
        setCount(body.count);
        setCls(body.classification);
      })
      .catch(() => {
        if (!alive) return;
        setCount(null);
        setCls("UNKNOWN");
      });
    return () => {
      alive = false;
    };
  }, []);

  const submitTyped = () => {
    const next = normalizeSpotSymbol(typed || symbol);
    if (!next) return;
    onSelect(next);
    setTyped("");
  };

  return (
    <div className={compact ? "" : "mb-4 pb-4 border-b border-plimsoll/15"} role="group" aria-label="Asset">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div className="font-code text-[9px] tracking-[0.25em] text-plimsoll/50">ASSET</div>
        <div className="font-code text-[8px] tracking-[0.18em] text-plimsoll/35">
          {count != null
            ? `${count} LIVE USDT PAIRS · ${cls}`
            : "TYPE ANY CURRENTLY TRADABLE SPOT USDT PAIR"}
        </div>
      </div>
      <div className={compact ? "grid grid-cols-7 gap-1" : "flex flex-wrap gap-1.5"}>
        {ASSETS.map((a) => {
          const active = a.symbol === symbol;
          return (
            <button
              key={a.symbol}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(a.symbol)}
              className={`flex items-center gap-2 ${
                compact ? "flex-col justify-center py-2 px-0" : "pl-1.5 pr-2.5 py-1.5"
              } border font-code text-[10px] tracking-[0.1em] transition-colors ${
                active
                  ? compact
                    ? "border-plimsoll bg-plimsoll/15 text-plimsoll"
                    : "bg-plimsoll text-plimsoll-black border-plimsoll"
                  : compact
                    ? "border-white/10 text-white/45 hover:border-plimsoll/50 hover:text-plimsoll/80"
                    : "border-plimsoll/25 text-plimsoll/60 hover:border-plimsoll/60 hover:text-plimsoll"
              } ${focusGold}`}
              aria-label={`Solve capacity for ${a.symbol}`}
            >
              <img src={a.icon} alt="" className={compact ? "w-4 h-4" : "w-6 h-6"} width={compact ? 16 : 24} height={compact ? 16 : 24} draggable={false} loading="lazy" />
              <span className={compact ? "font-code text-[8px] tracking-[0.08em]" : undefined}>{a.base}</span>
            </button>
          );
        })}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitTyped();
        }}
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={`${symbol} or another USDT pair`}
          aria-label="Spot USDT symbol"
          className={`flex-1 min-w-0 bg-transparent border border-plimsoll/25 px-3 py-2 font-code text-[11px] tracking-[0.12em] text-plimsoll placeholder:text-white/25 ${focusGold}`}
        />
        <button
          type="submit"
          className={`shrink-0 border border-plimsoll/40 px-3 py-2 font-code text-[10px] tracking-[0.18em] text-plimsoll hover:bg-plimsoll/10 ${focusGold}`}
        >
          USE
        </button>
      </form>
      <p className="mt-2 font-code text-[8px] tracking-[0.14em] text-white/30 leading-relaxed">
        Works with currently tradable Spot symbols supported by the live Binance exchange metadata and their current trading filters.
      </p>
    </div>
  );
}
