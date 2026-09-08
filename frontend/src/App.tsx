import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiBase, getHealth, postApproval, postCapacity, postIntent, postResolve } from "./api";
import { classificationLabel } from "./labels";

type Cap = {
  estimated_exit_capacity_notional: string;
  cost_capacity_notional: string;
  time_capacity_notional: string;
  binding: string;
  confidence: string;
  assumptions: Record<string, string>;
  warnings: string[];
};

function money(v: string | number | undefined) {
  if (v === undefined || v === null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function App() {
  const [text, setText] = useState("I want $1000 of ARK and need to exit within one day.");
  const [symbol, setSymbol] = useState("ARKUSDT");
  const [held, setHeld] = useState("");
  const [costBps, setCostBps] = useState("50");
  const [horizon, setHorizon] = useState("1");
  const [participation, setParticipation] = useState("0.10");
  const [bookFrac, setBookFrac] = useState("0.5");
  const [health, setHealth] = useState<{ writes_enabled: boolean; kill_switch: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [classification, setClassification] = useState("UNKNOWN");
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<Cap | null>(null);
  const [decision, setDecision] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lastResolve, setLastResolve] = useState<string | null>(null);

  const constitution = useMemo(
    () => ({
      max_exit_cost_bps: costBps,
      max_exit_horizon_days: horizon,
      max_participation: participation,
      max_fraction_of_visible_book: bookFrac,
      never_increase_if_capacity_falling: true,
    }),
    [costBps, horizon, participation, bookFrac],
  );

  const position = held.trim()
    ? { symbol: symbol.toUpperCase(), base_qty: held.trim() }
    : undefined;

  useEffect(() => {
    getHealth()
      .then((h) => setHealth({ writes_enabled: h.writes_enabled, kill_switch: h.kill_switch }))
      .catch(() => setHealth(null));
  }, []);

  function applyBody(body: any, kind: string) {
    setClassification(classificationLabel(body.classification));
    setSnapshotHash(body.snapshot_hash || null);
    const cap = body.capacity || body.decision?.capacity;
    if (cap) setCapacity(cap);
    if (body.decision) setDecision(body.decision);
    if (typeof body.capacity_collapsed === "boolean") setCollapsed(body.capacity_collapsed);
    if (kind === "resolve") setLastResolve(new Date().toISOString());
  }

  async function run(kind: "capacity" | "intent" | "resolve") {
    setBusy(kind);
    setError(null);
    setApproval(null);
    try {
      const body =
        kind === "capacity"
          ? await postCapacity(symbol, constitution, position)
          : kind === "intent"
            ? await postIntent(text, symbol, constitution, position)
            : await postResolve(symbol, constitution, position);
      applyBody(body, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await run("intent");
  }

  async function approve() {
    if (!decision) return;
    setBusy("approve");
    setError(null);
    try {
      const body = await postApproval(decision);
      setApproval(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "approval failed");
    } finally {
      setBusy(null);
    }
  }

  const requested = decision?.requested_notional;
  const est = capacity?.estimated_exit_capacity_notional;
  const over = Boolean(decision?.over_capacity);

  return (
    <div className="page">
      <header className="mast">
        <p className="kicker">Load line for altcoin exits</p>
        <h1>PLIMSOLL</h1>
        <p className="lede">
          Estimated exit capacity under your stated constraints. Not a maximum safe size. Not a guaranteed exit.
        </p>
        <p className="meta">
          Backend <code>{apiBase()}</code>
          <span className={`chip chip-${classification.toLowerCase()}`}>{classification}</span>
          {health?.writes_enabled ? <span className="chip chip-warn">writes on</span> : <span className="chip">writes off</span>}
          {health?.kill_switch ? <span className="chip chip-warn">halted</span> : null}
        </p>
      </header>

      <form className="panel" onSubmit={onSubmit}>
        <label>
          Intent
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        </label>
        <div className="grid">
          <label>
            Symbol
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
          </label>
          <label>
            Held base qty
            <input value={held} onChange={(e) => setHeld(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <fieldset>
          <legend>Constitution (visible assumptions)</legend>
          <div className="grid four">
            <label>
              Max exit cost (bps)
              <input value={costBps} onChange={(e) => setCostBps(e.target.value)} />
            </label>
            <label>
              Horizon (days)
              <input value={horizon} onChange={(e) => setHorizon(e.target.value)} />
            </label>
            <label>
              Participation of 24h volume
              <input value={participation} onChange={(e) => setParticipation(e.target.value)} />
            </label>
            <label>
              Max fraction of visible book
              <input value={bookFrac} onChange={(e) => setBookFrac(e.target.value)} />
            </label>
          </div>
        </fieldset>
        <div className="actions">
          <button type="submit" disabled={!!busy}>{busy === "intent" ? "Observing…" : "Ask the agent"}</button>
          <button type="button" className="ghost" disabled={!!busy} onClick={() => run("capacity")}>
            Capacity only
          </button>
          <button type="button" className="ghost" disabled={!!busy} onClick={() => run("resolve")}>
            Re-solve held position
          </button>
        </div>
      </form>

      {error ? <p className="error" role="alert">{error}</p> : null}

      {capacity ? (
        <section className="panel result">
          <h2>Estimated exit capacity</h2>
          <p className="hero">{money(est)} <small>USDT notional</small></p>
          <p className="binding">Binding constraint: <strong>{capacity.binding}</strong> · confidence {capacity.confidence}</p>
          <div className="meters">
            <div>
              <span>Cost capacity</span>
              <strong>{money(capacity.cost_capacity_notional)}</strong>
            </div>
            <div>
              <span>Time capacity</span>
              <strong>{money(capacity.time_capacity_notional)}</strong>
            </div>
          </div>
          <p>Requested: {requested != null ? money(requested) : "—"} · Held over capacity: {over ? "yes — TRIM proposed, never a silent sell" : "no"}</p>
          {collapsed ? <p className="warn">Capacity collapsed versus the prior observation on this instance.</p> : null}
          {snapshotHash ? <p className="hash">Snapshot {snapshotHash.slice(0, 16)}…</p> : null}
          {capacity.warnings?.length ? <p className="warn">Warnings: {capacity.warnings.join(", ")}</p> : null}
          <ul className="assumptions">
            <li>Participation {capacity.assumptions.max_participation} of 24h quote volume</li>
            <li>Horizon {capacity.assumptions.max_exit_horizon_days} day(s)</li>
            <li>Cost budget {capacity.assumptions.max_exit_cost_bps} bps all-in</li>
            <li>Visible book fraction {capacity.assumptions.max_fraction_of_visible_book}</li>
          </ul>
        </section>
      ) : null}

      {decision ? (
        <section className="panel">
          <h2>Decision</h2>
          <p>
            <strong>{decision.action}</strong> · {decision.state}
          </p>
          <p>{decision.reason}</p>
          {decision.legal_order ? (
            <p>
              Legalized {decision.legal_order.side} {decision.legal_order.type}
              {decision.legal_order.quote_order_qty ? ` quoteOrderQty ${decision.legal_order.quote_order_qty}` : ""}
              {decision.legal_order.quantity ? ` qty ${decision.legal_order.quantity}` : ""}
              {decision.legal_order.clipped ? " (clipped by filters)" : ""}
            </p>
          ) : null}
          <button type="button" disabled={!!busy} onClick={approve}>
            Issue snapshot-bound approval
          </button>
        </section>
      ) : null}

      {approval ? (
        <section className="panel">
          <h2>Approval</h2>
          <p>Expires {approval.expires_at}</p>
          <p className="hash">Token is not sufficient authorization. A live order still requires typing CONFIRM and writes_enabled=true on the backend.</p>
          <p>{approval.note}</p>
        </section>
      ) : null}

      <footer>
        Last re-solve: {lastResolve || "none this session"}. Classification comes from the backend. Replay is never shown as live.
      </footer>
    </div>
  );
}
