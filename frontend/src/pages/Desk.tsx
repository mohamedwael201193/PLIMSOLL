import { FormEvent, useEffect, useMemo, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { apiBase, getFills, getHealth, getReady, getSnapshots, postApproval, postCapacity, postIntent, postResolve } from "../api";
import { classificationLabel } from "../labels";
import { ageLabel, money } from "../lib/money";
import { pushSeries, readSeries, type SeriesPoint } from "../lib/sessionSeries";
import { DepthChart, SeriesChart, UtilizationBar } from "../components/Charts";
import { TokenMark } from "../components/TokenMark";
import { SiteNav } from "../components/SiteNav";
import { baseAsset } from "../lib/tokenCandidates";

type Cap = {
  estimated_exit_capacity_notional: string;
  cost_capacity_notional: string;
  time_capacity_notional: string;
  binding: string;
  confidence: string;
  assumptions: Record<string, string>;
  warnings: string[];
};

type Market = {
  last_price: string;
  quote_volume_24h: string;
  captured_at: string;
  source: string;
  bids: Array<{ price: string; quantity: string }>;
  classification: string;
  filters?: { min_notional: string; quote_asset: string; base_asset: string };
};

export function Desk() {
  const [menu, setMenu] = useState(false);
  const [text, setText] = useState("I want $1000 of ARK and need to exit within one day.");
  const [symbol, setSymbol] = useState("ARKUSDT");
  const [held, setHeld] = useState("");
  const [costBps, setCostBps] = useState("50");
  const [horizon, setHorizon] = useState("1");
  const [participation, setParticipation] = useState("0.10");
  const [bookFrac, setBookFrac] = useState("0.5");
  const [health, setHealth] = useState<{ writes_enabled: boolean; kill_switch: boolean } | null>(null);
  const [db, setDb] = useState<string>("UNKNOWN");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [classification, setClassification] = useState("UNKNOWN");
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<Cap | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [decision, setDecision] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lastResolve, setLastResolve] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>(() => readSeries("ARKUSDT"));
  const [priceHist, setPriceHist] = useState<number[]>([]);
  const [histClass, setHistClass] = useState("UNKNOWN");
  const [fills, setFills] = useState<Array<{ client_order_id: string; status: string; cumm_quote: string }>>([]);

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

  const position = held.trim() ? { symbol: symbol.toUpperCase(), base_qty: held.trim() } : undefined;

  useEffect(() => {
    getHealth()
      .then((h) => setHealth({ writes_enabled: h.writes_enabled, kill_switch: h.kill_switch }))
      .catch(() => setHealth(null));
    getReady()
      .then((r) => setDb(r.database))
      .catch(() => setDb("DOWN"));
    getFills()
      .then((b) => setFills(b.fills || []))
      .catch(() => setFills([]));
  }, []);

  useEffect(() => {
    setSeries(readSeries(symbol.toUpperCase()));
    getSnapshots(symbol.toUpperCase())
      .then((body) => {
        const vals = (body.observations || [])
          .map((o) => Number(o.last_price))
          .filter((n) => Number.isFinite(n) && n > 0);
        setPriceHist(vals);
        const lastCls = body.observations?.[body.observations.length - 1]?.classification;
        setHistClass(classificationLabel(lastCls));
      })
      .catch(() => {
        setPriceHist([]);
        setHistClass("UNKNOWN");
      });
  }, [symbol]);

  function remember(body: any) {
    const cap = body.capacity || body.decision?.capacity;
    if (!cap) return;
    const point: SeriesPoint = {
      t: body.captured_at || new Date().toISOString(),
      est: Number(cap.estimated_exit_capacity_notional),
      cost: Number(cap.cost_capacity_notional),
      time: Number(cap.time_capacity_notional),
      classification: classificationLabel(body.classification),
      hash: body.snapshot_hash,
    };
    if (Number.isFinite(point.est)) {
      setSeries(pushSeries(symbol.toUpperCase(), point));
    }
  }

  function applyBody(body: any, kind: string) {
    setClassification(classificationLabel(body.classification));
    setSnapshotHash(body.snapshot_hash || null);
    const cap = body.capacity || body.decision?.capacity;
    if (cap) setCapacity(cap);
    if (body.market) setMarket(body.market);
    if (body.decision) setDecision(body.decision);
    if (typeof body.capacity_collapsed === "boolean") setCollapsed(body.capacity_collapsed);
    if (kind === "resolve") setLastResolve(new Date().toISOString());
    remember(body);
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
      setClassification("UNKNOWN");
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
  const over = Boolean(decision?.over_capacity || (decision && Number(held) > 0 && decision.state === "OVER_CAPACITY"));
  const heldNotional = decision?.intent?.held_notional ?? null;
  const liveAge = ageLabel(market?.captured_at);
  const statusText =
    classification === "LIVE"
      ? `LIVE · ${liveAge}`
      : classification === "UNKNOWN"
        ? "NO BASELINE"
        : classification;

  return (
    <div className="desk">
      <SiteNav variant="desk" />
      <button type="button" className="menu-btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-controls="desk-side">
        {menu ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
        <span>Menu</span>
      </button>
      <aside id="desk-side" className={menu ? "side is-open" : "side"}>
        <p className="thesis">Does this exposure still fit the exit you chose?</p>
        <p className="side-meta">
          Backend {apiBase().replace("https://", "")}
        </p>
        <p className="side-meta">Database {db}</p>
        <p className="side-meta">{health?.writes_enabled ? "Writes on" : "Writes off"}</p>
        {health?.kill_switch ? <p className="side-meta warn">Kill switch</p> : null}
      </aside>
      <div className="desk-main">
        <div className="topbar">
          <p className={`status status-${classification.toLowerCase()}`}>{statusText}</p>
        </div>
        <main id="main" className="desk-body">
          <header className="desk-head">
            <div className="asset-line">
              <TokenMark symbol={baseAsset(symbol)} size={40} />
              <h1>{symbol}</h1>
            </div>
            <p className="display">{est ? money(est) : "Ask for a snapshot"}</p>
            <p className="subhead">
              {capacity ? `Estimated exit capacity · binding ${capacity.binding} · ${capacity.confidence}` : "No LIVE estimate yet this session."}
            </p>
          </header>

          <form className="intent-form" onSubmit={onSubmit}>
            <label>
              Intent
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
            </label>
            <div className="grid-2">
              <label>
                Symbol
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
              </label>
              <label>
                Held base qty
                <input value={held} onChange={(e) => setHeld(e.target.value)} />
                <span className="help">Leave blank for pre-trade. Re-solve needs a qty.</span>
              </label>
            </div>
            <div className="grid-4">
              <label>
                Max exit cost (bps)
                <input value={costBps} onChange={(e) => setCostBps(e.target.value)} />
              </label>
              <label>
                Horizon (days)
                <input value={horizon} onChange={(e) => setHorizon(e.target.value)} />
              </label>
              <label>
                Participation
                <input value={participation} onChange={(e) => setParticipation(e.target.value)} />
              </label>
              <label>
                Visible book fraction
                <input value={bookFrac} onChange={(e) => setBookFrac(e.target.value)} />
              </label>
            </div>
            <div className="actions">
              <button type="submit" className="btn" disabled={!!busy}>
                {busy === "intent" ? "Observing" : "Ask the agent"}
              </button>
              <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => run("capacity")}>
                Capacity only
              </button>
              <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => run("resolve")}>
                Re-solve
              </button>
            </div>
          </form>

          {error ? <p className="error" role="alert">{error}</p> : null}

          {capacity ? (
            <section className="facts">
              <div>
                <span>Cost capacity</span>
                <strong>{money(capacity.cost_capacity_notional)}</strong>
              </div>
              <div>
                <span>Time capacity</span>
                <strong>{money(capacity.time_capacity_notional)}</strong>
              </div>
              <div>
                <span>Requested</span>
                <strong>{requested != null ? money(requested) : "n/a"}</strong>
              </div>
              <div>
                <span>Last price</span>
                <strong>{market?.last_price ?? "n/a"}</strong>
              </div>
              <div>
                <span>24h quote volume</span>
                <strong>{money(market?.quote_volume_24h)}</strong>
              </div>
            </section>
          ) : null}

          <UtilizationBar
            held={heldNotional != null ? Number(heldNotional) : null}
            capacity={est ? Number(est) : null}
          />

          <div className="chart-row">
            <DepthChart bids={market?.bids || []} classification={market?.classification || classification} />
            <SeriesChart
              values={series.map((p) => p.est).filter((n) => Number.isFinite(n))}
              classification={series[series.length - 1]?.classification || "UNKNOWN"}
              label="Capacity this session"
            />
            <SeriesChart values={priceHist} classification={histClass} label="Stored last price" />
          </div>

          {capacity?.warnings?.length ? <p className="warn">Warnings: {capacity.warnings.join(", ")}</p> : null}
          {over ? <p className="warn">Held notional is above estimated exit capacity. TRIM is a proposal, never a silent sell.</p> : null}
          {collapsed ? <p className="warn">Capacity fell versus the prior observation on this instance.</p> : null}
          {snapshotHash ? <p className="hash">Snapshot {snapshotHash.slice(0, 18)}</p> : null}
          {market?.source ? <p className="hash">Source {market.source}</p> : null}

          {decision ? (
            <section className="decision">
              <h2>{decision.action}</h2>
              <p>{decision.state}</p>
              <p>{decision.reason}</p>
              {decision.legal_order ? (
                <p>
                  Legalized {decision.legal_order.side} {decision.legal_order.type}
                  {decision.legal_order.quote_order_qty ? ` quoteOrderQty ${decision.legal_order.quote_order_qty}` : ""}
                  {decision.legal_order.quantity ? ` qty ${decision.legal_order.quantity}` : ""}
                  {decision.legal_order.clipped ? " (clipped by filters)" : ""}
                </p>
              ) : null}
              <button type="button" className="btn" disabled={!!busy} onClick={approve}>
                Issue snapshot-bound approval
              </button>
            </section>
          ) : null}

          {approval ? (
            <section className="decision">
              <h2>Approval issued</h2>
              <p>Expires {approval.expires_at}</p>
              <p>Token is not a financial write. A live order still requires typing CONFIRM and writes_enabled=true on the backend.</p>
            </section>
          ) : null}

          <section className="log">
            <h2>Execution history</h2>
            {fills.length === 0 ? (
              <p className="chart-empty">No fills stored. None invented.</p>
            ) : (
              <ul>
                {fills.map((f) => (
                  <li key={f.client_order_id}>
                    {f.status} · {money(f.cumm_quote)} · {f.client_order_id}
                  </li>
                ))}
              </ul>
            )}
            <p className="quiet">Last re-solve this session: {lastResolve || "none"}.</p>
          </section>
        </main>
      </div>
    </div>
  );
}
