"use client";

import { useCallback, useEffect, useState } from "react";
import { getAccount, getHealth } from "./oregon";

export type ConnectPhase =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "READING ACCOUNT"
  | "ERROR";

export interface AccountState {
  phase: ConnectPhase;
  connected: boolean;
  classification: string;
  accountKind: string;
  reason?: string;
  agenticNote?: string;
  canTrade?: boolean;
  balances: Array<{ asset: string; free: string; locked: string }>;
  writesEnabled: boolean;
  killSwitch: boolean;
  bound?: boolean;
  toolCount?: number;
  capabilities?: Record<string, string>;
}

const EMPTY: AccountState = {
  phase: "CONNECTING",
  connected: false,
  classification: "UNKNOWN",
  accountKind: "NOT_CONNECTED",
  balances: [],
  writesEnabled: false,
  killSwitch: false,
};

export function useAccount() {
  const [state, setState] = useState<AccountState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, phase: s.connected ? "READING ACCOUNT" : "CONNECTING" }));
    setError(null);
    try {
      const [acct, health] = await Promise.all([
        getAccount(),
        getHealth().catch(() => null),
      ]);
      const connected = Boolean(acct.connected);
      setState({
        phase: connected ? "CONNECTED" : acct.account_kind === "MCP_UNREACHABLE" ? "ERROR" : "DISCONNECTED",
        connected,
        classification: acct.classification || "UNKNOWN",
        accountKind: acct.account_kind || "NOT_CONNECTED",
        reason: acct.reason,
        agenticNote: acct.agentic_note,
        canTrade: acct.can_trade,
        balances: acct.balances || [],
        writesEnabled: Boolean(health?.writes_enabled ?? acct.writes_enabled),
        killSwitch: Boolean(health?.kill_switch ?? acct.kill_switch),
        bound: acct.bound,
        toolCount: acct.tool_count,
        capabilities: acct.capabilities,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Agentic account could not be reached.";
      setError(message);
      setState((s) => ({
        ...s,
        phase: "ERROR",
        connected: false,
        reason: message,
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, error, refresh };
}
