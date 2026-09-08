"use client";

/**
 * PORTFOLIO — Agentic account positions only.
 * Disconnected: NO CONNECTED ACCOUNT. Never invents fills or mark values.
 */

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ASSETS, DEFAULT_CONSTRAINTS, getAsset } from "@/lib/capacity";
import { getTickers, postCapacity } from "@/lib/oregon";
import { useAccount } from "@/lib/useAccount";
import { ConnectPanel } from "../ConnectPanel";
import { BEZIER, Corners, SectionLabel, StatusChip, focusGold, fmtUsdFull } from "./shared";

interface Props {
  glitch: boolean;
}

export interface LivePosition {
  symbol: string;
  qty: number;
  markValue: number;
  capacity: number;
  utilization: number;
  status: "OVER_CAPACITY" | "WITHIN_CAPACITY";
  classification: string;
}

const GRID_COLS =
  "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.5fr)]";

const HEADERS = ["ASSET", "MARK VALUE", "EST. EXIT CAPACITY", "UTILIZATION", "STATUS", ""];

export default function Portfolio({ glitch }: Props) {
  const account = useAccount();
  const [rows, setRows] = useState<LivePosition[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!account.connected) {
      setRows([]);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoadError(null);
      try {
        const crypto = account.balances.filter((b) => b.asset !== "USDT" && Number(b.free) + Number(b.locked) > 0);
        const symbols = crypto
          .map((b) => ASSETS.find((a) => a.base === b.asset)?.symbol)
          .filter((s): s is string => Boolean(s));
        const tickers = symbols.length ? await getTickers(symbols) : { rows: [], classification: "UNKNOWN" };
        const lastBy = Object.fromEntries((tickers.rows || []).map((r) => [r.symbol, r.last]));
        const next: LivePosition[] = [];
        for (const b of crypto) {
          const asset = ASSETS.find((a) => a.base === b.asset);
          if (!asset) continue;
          const qty = Number(b.free) + Number(b.locked);
          const last = lastBy[asset.symbol];
          if (!(last > 0)) continue;
          const markValue = qty * last;
          const { mapped } = await postCapacity(
            { ...DEFAULT_CONSTRAINTS, symbol: asset.symbol, targetNotional: Math.max(500, Math.round(markValue)) },
            { symbol: asset.symbol, base_qty: String(qty) }
          );
          const capacity = mapped.exitCapacity;
          const utilization = capacity > 0 ? (markValue / capacity) * 100 : 0;
          next.push({
            symbol: asset.symbol,
            qty,
            markValue,
            capacity,
            utilization,
            status: markValue > capacity ? "OVER_CAPACITY" : "WITHIN_CAPACITY",
            classification: mapped.classification,
          });
        }
        if (alive) setRows(next);
      } catch (e) {
        if (alive) {
          setRows([]);
          setLoadError(e instanceof Error ? e.message : "Account data could not be read.");
        }
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [account.connected, account.balances]);

  const connected = account.connected;
  const list = rows ?? [];
  const totalMark = list.reduce((s, p) => s + p.markValue, 0);
  const totalCapacity = list.reduce((s, p) => s + p.capacity, 0);
  const worst = list.reduce<LivePosition | null>((w, p) => (w && w.utilization >= p.utilization ? w : p), null);
  const cls = list.find((p) => p.classification === "LIVE") ? "LIVE" : connected ? "UNKNOWN" : "NOT CONNECTED";

  return (
    <main
      id="portfolio"
      className={`relative grid-dark-dense noise scanlines overflow-hidden pt-28 sm:pt-32 pb-16 ${
        glitch ? "glitch-on" : ""
      }`}
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <div>
          <SectionLabel index="02" name="POSITIONS" />
          <h1 className="mt-2 font-display text-3xl sm:text-5xl leading-none text-white">
            <span className="glitch-text" data-text="PORTFOLIO">
              PORTFOLIO
            </span>
          </h1>
          <p className="mt-3 max-w-xl font-grotesk text-[13px] sm:text-[15px] leading-relaxed text-white/60">
            PLIMSOLL estimates how much exposure the market can support under your stated exit constraints — then compares that line to a real Agentic account when one is bound.
          </p>
          <p className="mt-3 font-code text-[10px] tracking-[0.3em] text-plimsoll/60">
            [ POSITIONS — CLASSIFICATION: {cls} ]
          </p>
        </div>

        {!connected && (
          <div className="mt-6 max-w-3xl">
            <ConnectPanel account={account} />
          </div>
        )}

        {connected && (
          <>
            <div className="mt-6 grid sm:grid-cols-3 border border-plimsoll/25 bg-plimsoll-black/95 divide-y sm:divide-y-0 sm:divide-x divide-plimsoll/15">
              <Stat label="TOTAL MARK VALUE" value={rows ? fmtUsdFull(totalMark) : "—"} tone="text-white" />
              <Stat
                label="TOTAL EST. EXIT CAPACITY"
                value={rows ? fmtUsdFull(totalCapacity) : "—"}
                tone="text-plimsoll"
              />
              <Stat
                label="WORST UTILIZATION"
                value={worst ? `${worst.utilization.toFixed(0)}% — ${worst.symbol}` : "—"}
                tone={worst && worst.status === "OVER_CAPACITY" ? "text-rose-300" : "text-plimsoll"}
              />
            </div>

            <section aria-label="Positions" className="corner-frame-4 text-plimsoll border border-plimsoll/25 bg-plimsoll-ink mt-6">
              <Corners />
              <div
                className={`hidden md:grid ${GRID_COLS} gap-4 px-4 sm:px-6 py-3 border-b border-plimsoll/15 font-code text-[9px] tracking-[0.25em] text-plimsoll/50`}
              >
                {HEADERS.map((h, i) => (
                  <span key={i} className={i === HEADERS.length - 1 ? "text-right" : undefined}>
                    {h}
                  </span>
                ))}
              </div>
              <div className="divide-y divide-plimsoll/15">
                {rows === null && (
                  <div className="py-10 text-center font-code text-[10px] tracking-[0.25em] text-plimsoll/50 blink">
                    READING ACCOUNT…
                  </div>
                )}
                {rows && list.length === 0 && (
                  <div className="py-10 text-center font-code text-[10px] tracking-[0.2em] text-plimsoll/50">
                    {loadError || "NO SUPPORTED SPOT POSITIONS ON THE CONNECTED ACCOUNT"}
                    <div className="mt-2 text-plimsoll/35">USDT AND UNSUPPORTED ASSETS ARE NOT INVENTED INTO THIS TABLE</div>
                  </div>
                )}
                {list.map((p, i) => (
                  <PositionRow key={p.symbol} p={p} i={i} />
                ))}
              </div>
            </section>
          </>
        )}

        <p className="mt-3 font-code text-[9px] tracking-[0.12em] text-plimsoll/40 leading-relaxed">
          {connected
            ? "Empty execution history means none stored. The desk never invents fills."
            : "Connect the Agentic Sub through official Agent OS. This page will not populate invented balances."}
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="font-code text-[9px] tracking-[0.25em] text-plimsoll/50">{label}</div>
      <div className={`mt-1.5 font-display text-lg sm:text-xl ${tone}`}>{value}</div>
    </div>
  );
}

function PositionRow({ p, i }: { p: LivePosition; i: number }) {
  const asset = getAsset(p.symbol);
  const over = p.status === "OVER_CAPACITY";

  return (
    <motion.a
      href={`#/position/${p.symbol}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: BEZIER, delay: 0.08 * i }}
      className={`block md:grid ${GRID_COLS} md:items-center gap-4 px-4 sm:px-6 py-4 transition-colors hover:bg-plimsoll/5 group ${focusGold}`}
      aria-label={`Open position detail for ${p.symbol}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {asset && (
          <img src={asset.icon} alt="" className="w-7 h-7 shrink-0" width={28} height={28} draggable={false} loading="lazy" />
        )}
        <div className="min-w-0">
          <div className="font-code text-xs tracking-[0.1em] text-plimsoll">{p.symbol}</div>
          <div className="font-grotesk text-[12px] text-white/60 truncate">
            {asset?.name ?? "—"}
            {asset ? ` · ${p.qty.toLocaleString("en-US")} ${asset.base}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:contents">
        <Cell label="MARK VALUE">
          <span className="font-code text-[12px] text-white/85 tabular-nums">{fmtUsdFull(p.markValue)}</span>
        </Cell>
        <Cell label="EST. EXIT CAPACITY">
          <span className="font-code text-[12px] text-plimsoll tabular-nums">{fmtUsdFull(p.capacity)}</span>
        </Cell>
        <Cell label="UTILIZATION">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative h-2 flex-1 min-w-8 bg-plimsoll-black border border-plimsoll/20 overflow-hidden">
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 ${over ? "bg-rose-400" : "bg-plimsoll"}`}
                style={{ width: `${Math.min(100, p.utilization)}%` }}
              />
            </div>
            <span className={`font-code text-[10px] tabular-nums shrink-0 ${over ? "text-rose-300" : "text-plimsoll"}`}>
              {p.utilization.toFixed(0)}%
            </span>
          </div>
        </Cell>
        <Cell label="STATUS">
          <StatusChip status={p.status} />
        </Cell>
        <div className="hidden md:flex items-center justify-end">
          <span className="font-code text-[10px] tracking-[0.2em] text-plimsoll/50 group-hover:text-plimsoll transition-colors">
            OPEN →
          </span>
        </div>
      </div>
    </motion.a>
  );
}

function Cell({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="md:hidden font-code text-[8px] tracking-[0.25em] text-plimsoll/40 mb-1">{label}</div>
      {children}
    </div>
  );
}
