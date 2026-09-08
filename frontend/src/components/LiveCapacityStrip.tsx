import { useEffect, useState } from "react";
import { postCapacity } from "../api";
import { money } from "../lib/money";
import { classificationLabel } from "../labels";
import { TokenMark } from "./TokenMark";

const CONST = {
  max_exit_cost_bps: "50",
  max_exit_horizon_days: "1",
  max_participation: "0.10",
  max_fraction_of_visible_book: "0.5",
  never_increase_if_capacity_falling: true,
};

export function LiveCapacityStrip() {
  const [state, setState] = useState<"loading" | "error" | "ok">("loading");
  const [error, setError] = useState<string | null>(null);
  const [est, setEst] = useState<string | null>(null);
  const [binding, setBinding] = useState<string | null>(null);
  const [cls, setCls] = useState("UNKNOWN");
  const [age, setAge] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    postCapacity("ARKUSDT", CONST)
      .then((body) => {
        if (!alive) return;
        setCls(classificationLabel(body.classification));
        setEst(body.capacity?.estimated_exit_capacity_notional ?? null);
        setBinding(body.capacity?.binding ?? null);
        setAge(body.captured_at ?? body.market?.captured_at ?? null);
        setState("ok");
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "capacity failed");
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="live-strip" id="live">
      <div className="live-strip-copy">
        <h2>Live capacity, this snapshot</h2>
        <p>ARKUSDT under a 50 bps / 1 day / 10% ADV constitution. Number comes from production Oregon, not a mock.</p>
      </div>
      <div className="live-strip-board">
        <div className="live-asset">
          <TokenMark symbol="ARK" size={36} />
          <span>ARKUSDT</span>
          <span className={`chip chip-${cls.toLowerCase()}`}>{cls}</span>
        </div>
        {state === "loading" ? <div className="skel skel-hero" /> : null}
        {state === "error" ? (
          <p className="error" role="alert">
            {error}. Free Render may be waking. Open the desk and retry.
          </p>
        ) : null}
        {state === "ok" ? (
          <>
            <p className="live-num">{money(est)} <small>USDT</small></p>
            <p className="live-bind">Binding {binding || "n/a"}{age ? ` · ${age}` : ""}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
