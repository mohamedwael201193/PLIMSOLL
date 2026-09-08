"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Corners } from "./desk/shared";
import { focusGold } from "./landing/shared";
import { oauthStartUrl } from "@/lib/oregon";
import type { AccountState } from "@/lib/useAccount";

const MCP_DOCS = "https://developers.binance.com/en/docs/agent-native/mcp-server";
const MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";

export function ConnectPanel({
  account,
  onRefresh,
}: {
  account: AccountState & { error: string | null; refresh: () => Promise<void> };
  onRefresh?: () => void;
}) {
  const [authorizing, setAuthorizing] = useState(false);
  const kindLabel =
    account.accountKind === "SPOT_UNLABELLED"
      ? "AGENTIC ACCOUNT (SPOT — UNLABELLED BY MCP)"
      : account.accountKind === "NOT_CONNECTED"
        ? "NOT CONNECTED"
        : account.accountKind.replace(/_/g, " ");
  const phase = authorizing ? "AUTHORIZING" : account.phase;

  const startOAuth = () => {
    setAuthorizing(true);
    window.location.assign(oauthStartUrl(window.location.origin));
  };

  return (
    <section
      aria-label="Connect Binance"
      className="corner-frame-4 text-plimsoll border border-plimsoll/30 bg-plimsoll-ink p-4 sm:p-6"
    >
      <Corners />
      <div className="flex flex-wrap items-center justify-between gap-2 font-code text-[10px] tracking-[0.3em]">
        <span className="text-plimsoll">CONNECT BINANCE</span>
        <span className={account.connected ? "text-emerald-400" : "text-plimsoll/50"}>{phase}</span>
      </div>

      <div className="mt-4 font-display text-xl sm:text-2xl text-white">
        {account.connected ? "CONNECTED" : "NO CONNECTED ACCOUNT"}
      </div>
      <p className="mt-2 font-grotesk text-[13px] leading-relaxed text-white/65">
        {account.connected
          ? kindLabel
          : "Public market data is live. Private balances and execution stay off until official Agent OS OAuth binds the Agentic Sub on the Oregon server."}
      </p>

      {account.reason && (
        <p className="mt-3 font-code text-[10px] tracking-[0.12em] text-rose-300/90 leading-relaxed">
          {account.reason}
        </p>
      )}
      {account.error && !account.reason && (
        <p className="mt-3 font-code text-[10px] tracking-[0.12em] text-rose-300/90">{account.error}</p>
      )}

      {account.connected && (
        <div className="mt-4 space-y-2 font-code text-[10px] tracking-[0.12em]">
          <div className="flex justify-between gap-4">
            <span className="text-white/45">ACCOUNT</span>
            <span className="text-plimsoll">{kindLabel}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/45">CAN TRADE</span>
            <span className="text-white">{account.canTrade ? "YES" : "NO"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/45">MCP TOOLS</span>
            <span className="text-white">{account.toolCount ?? "—"}</span>
          </div>
          {(account.balances || []).map((b) => (
            <div key={b.asset} className="flex justify-between gap-4">
              <span className="text-white/45">{b.asset}</span>
              <span className="text-plimsoll">
                FREE {b.free}
                {Number(b.locked) > 0 ? ` · LOCKED ${b.locked}` : ""}
              </span>
            </div>
          ))}
          {account.balances.length === 0 && (
            <div className="text-white/50">Account connected, but no funds are available.</div>
          )}
          {account.agenticNote && (
            <p className="pt-2 text-white/40 leading-relaxed">{account.agenticNote}</p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={
            account.connected
              ? () => {
                  void account.refresh();
                  onRefresh?.();
                }
              : startOAuth
          }
          className={`tech-box-dark font-code text-[10px] sm:text-[11px] tracking-[0.2em] ${focusGold}`}
        >
          {authorizing ? "AUTHORIZING…" : account.connected ? "READ ACCOUNT" : "CONNECT BINANCE"}
        </button>
        {account.connected && (
          <button
            type="button"
            onClick={startOAuth}
            className={`tech-box-dark font-code text-[10px] sm:text-[11px] tracking-[0.2em] ${focusGold}`}
          >
            RE-AUTHORIZE
          </button>
        )}
        <a
          href={MCP_DOCS}
          target="_blank"
          rel="noreferrer"
          className={`tech-box-dark font-code text-[10px] sm:text-[11px] tracking-[0.2em] ${focusGold}`}
        >
          AGENT OS OAUTH
        </a>
      </div>

      <div className="mt-4 border border-plimsoll/40 bg-plimsoll/10 p-3 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-plimsoll shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
        <p className="font-grotesk text-[11px] leading-snug text-white/60">
          Do not paste API secrets here. CONNECT BINANCE opens official Agent OS OAuth. The token stays on Oregon. Official MCP: {MCP_ENDPOINT}.
        </p>
      </div>
    </section>
  );
}
