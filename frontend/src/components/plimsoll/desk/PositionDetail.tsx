"use client";

/**
 * POSITION DETAIL — per-symbol replay console.
 * Re-solves capacity for the symbol against the desk's constraint set,
 * compares the replay position against the current capacity, and stages
 * replay-only decisions. Nothing writes without confirm.
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { DEFAULT_CONSTRAINTS, assetFromSymbol, getAsset, type AssetInfo } from "@/lib/capacity";
import { getTickers, postCapacity } from "@/lib/oregon";
import { useAccount } from "@/lib/useAccount";
import { useCapacity, useCapacityHistory } from "./useCapacity";
import type { LivePosition } from "./Portfolio";
import {
  BEZIER,
  CapacityBarsCard,
  CapacityChartCard,
  CapacityReadout,
  ClassificationChip,
  ConstraintsPanel,
  Corners,
  StatusChip,
  UtilizationBar,
  focusGold,
  fmtUsdFull,
} from "./shared";

interface Props {
  glitch: boolean;
  symbol: string;
}

const DETAIL_ACTIONS = ["TRIM", "STAGE", "WAIT", "HOLD"];

export default function PositionDetail({ glitch, symbol }: Props) {
  const asset = getAsset(symbol) ?? assetFromSymbol(symbol);

  if (!asset) {
    return (
      <main
        id="position"
        className="relative grid-dark-dense noise scanlines overflow-hidden pt-28 sm:pt-32 pb-16"
      >
        <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
          <BackLink />
          <section className="corner-frame-4 text-plimsoll border border-plimsoll/30 bg-plimsoll-ink p-6 sm:p-10 mt-6 max-w-xl">
            <Corners />
            <div className="font-code text-[10px] tracking-[0.3em] text-rose-300">INVALID SYMBOL</div>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl text-white break-all">{symbol}</h1>
            <p className="mt-3 font-grotesk text-[13px] leading-relaxed text-white/60">
              Use a currently tradable Spot USDT pair from live Binance exchange metadata. The desk does not invent markets.
            </p>
            <a
              href="#/app"
              className={`tech-box-dark inline-flex font-code text-[11px] tracking-[0.2em] mt-6 ${focusGold}`}
            >
              OPEN THE DESK
            </a>
          </section>
        </div>
      </main>
    );
  }

  return <PositionConsole glitch={glitch} asset={asset} />;
}

function PositionConsole({ glitch, asset }: { glitch: boolean; asset: AssetInfo }) {
  const symbol = asset.symbol;
  const account = useAccount();
  const qtyRow = account.balances.find((b) => b.asset === asset.base);
  const qty = qtyRow ? Number(qtyRow.free) + Number(qtyRow.locked) : 0;
  const position = qty > 0 ? { symbol, base_qty: String(qty) } : undefined;
  const cap = useCapacity({
    initial: { ...DEFAULT_CONSTRAINTS, symbol, targetNotional: 10_000 },
    persist: false,
    position,
  });
  const hist = useCapacityHistory(symbol);
  const [held, setHeld] = useState<LivePosition | null>(null);

  useEffect(() => {
    if (!account.connected || qty <= 0) {
      setHeld(null);
      return;
    }
    let alive = true;
    const run = async () => {
      try {
        const tickers = await getTickers([symbol]);
        const last = tickers.rows[0]?.last;
        if (!(last > 0)) return;
        const markValue = qty * last;
        const { mapped } = await postCapacity(
          { ...DEFAULT_CONSTRAINTS, symbol, targetNotional: Math.max(500, Math.round(markValue)) },
          { symbol, base_qty: String(qty) }
        );
        if (!alive) return;
        const capacity = mapped.exitCapacity;
        setHeld({
          symbol,
          qty,
          markValue,
          capacity,
          utilization: capacity > 0 ? (markValue / capacity) * 100 : 0,
          status: markValue > capacity ? "OVER_CAPACITY" : "WITHIN_CAPACITY",
          classification: mapped.classification,
        });
      } catch {
        if (alive) setHeld(null);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [account.connected, qty, symbol]);

  useEffect(() => {
    if (qty > 0) void cap.compute();
  }, [qty, cap.compute]);

  return (
    <main
      id="position"
      className={`relative grid-dark-dense noise scanlines overflow-hidden pt-28 sm:pt-32 pb-16 ${
        glitch ? "glitch-on" : ""
      }`}
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-8">
        <BackLink />

        {/* asset header */}
        <header className="mt-5 flex flex-wrap items-center gap-4">
          <img
            src={asset.icon}
            alt={`${asset.name} logo`}
            className="w-8 h-8"
            width={32}
            height={32}
            draggable={false}
          />
          <h1 className="font-display text-2xl sm:text-4xl leading-none text-white">
            <span className="glitch-text" data-text={asset.symbol}>
              {asset.symbol}
            </span>
          </h1>
          <div>
            <div className="font-grotesk text-sm text-white/70">{asset.name}</div>
            <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/60">
              POSITION DETAIL — {account.connected ? "AGENTIC ACCOUNT" : "NO CONNECTED ACCOUNT"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {cap.loading ? (
              <span className="font-code text-[9px] tracking-[0.2em] text-plimsoll/70 blink">SOLVING…</span>
            ) : cap.result ? (
              <ClassificationChip classification={cap.result.classification} />
            ) : null}
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: BEZIER }}
          className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-5 sm:gap-6 items-start"
        >
          {/* ── left: instrument ── */}
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <CapacityReadout result={cap.result} loading={cap.loading} showClassification={false} />

            <PositionComparePanel
              position={held}
              connected={account.connected}
              reason={account.reason}
              symbol={symbol}
            />

            <CapacityChartCard history={hist.history} compact />
          </div>

          {/* ── right: constitution ── */}
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <CapacityBarsCard result={cap.result} />

            <ConstraintsPanel
              constraints={cap.constraints}
              onPatch={cap.patch}
              onCompute={(override) => void cap.compute(override)}
              loading={cap.loading}
              error={cap.error}
              stale={cap.stale}
              footerNote="POST /v1/intent · SOLVED FOR THIS POSITION ONLY"
            />
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <a
      href="#/portfolio"
      className={`inline-flex font-code text-[10px] tracking-[0.25em] text-plimsoll/60 hover:text-plimsoll transition-colors ${focusGold}`}
    >
      ← PORTFOLIO
    </a>
  );
}

/* ── current position vs current capacity ── */
function PositionComparePanel({
  position,
  connected,
  reason,
  symbol,
}: {
  position: LivePosition | null;
  connected: boolean;
  reason?: string;
  symbol: string;
}) {
  return (
    <section
      aria-label="Current position versus current capacity"
      className="corner-frame-4 text-plimsoll border border-plimsoll/30 bg-plimsoll-ink p-4 sm:p-6"
    >
      <Corners />
      <div className="flex items-center justify-between font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">POSITION vs CAPACITY</span>
        <span className="text-white/30">{connected ? "LIVE ACCOUNT" : "NOT CONNECTED"}</span>
      </div>

      {!connected ? (
        <div className="mt-5 py-6 text-center">
          <div className="font-code text-[10px] tracking-[0.25em] text-plimsoll/60">[ NO CONNECTED ACCOUNT ]</div>
          <p className="mt-2 font-grotesk text-[12px] leading-relaxed text-white/50 max-w-sm mx-auto">
            {reason || "No connected Agentic account. This page will not invent a position. Authorize through a supported Agent."}
          </p>
          <a href="#/settings" className={`tech-box-dark inline-flex font-code text-[11px] tracking-[0.2em] mt-6 ${focusGold}`}>
            SETTINGS
          </a>
        </div>
      ) : position ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/60">CURRENT POSITION</div>
              <div className="mt-1 font-display text-xl sm:text-3xl text-white">{fmtUsdFull(position.markValue)}</div>
            </div>
            <div>
              <div className="font-code text-[9px] tracking-[0.2em] text-plimsoll/60">CURRENT CAPACITY</div>
              <div className="mt-1 font-display text-xl sm:text-3xl text-plimsoll">{fmtUsdFull(position.capacity)}</div>
            </div>
          </div>

          <div className="mt-4">
            <UtilizationBar utilization={position.utilization} status={position.status} />
          </div>

          <div className="mt-3">
            <StatusChip status={position.status} />
          </div>

          {position.status === "OVER_CAPACITY" && (
            <div className="mt-4 border border-rose-400/40 bg-rose-400/5 p-3 sm:p-4">
              <div className="font-code text-[10px] tracking-[0.25em] text-rose-300">OVER CAPACITY — ACTION REQUIRED</div>
              <p className="mt-2 font-grotesk text-[12px] leading-relaxed text-white/70">
                The held position exceeds estimated exit capacity. Proposed actions stay with the operator.
                No silent sells.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DETAIL_ACTIONS.map((a) => (
                  <a
                    key={a}
                    href="#/app"
                    className={`border border-dashed border-plimsoll/55 text-plimsoll font-code text-[10px] tracking-[0.15em] px-3 py-2 transition-colors hover:bg-plimsoll hover:text-plimsoll-black hover:border-plimsoll ${focusGold}`}
                  >
                    {a}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-5 py-6 text-center">
          <div className="font-code text-[10px] tracking-[0.25em] text-plimsoll/60">[ FLAT — NO HELD POSITION ]</div>
          <p className="mt-2 font-grotesk text-[12px] leading-relaxed text-white/50 max-w-sm mx-auto">
            No {symbol} balance on the connected Agentic account. Capacity solves still apply — the desk never invents fills.
          </p>
        </div>
      )}
    </section>
  );
}
