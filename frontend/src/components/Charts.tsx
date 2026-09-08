type Level = { price: string; quantity: string };

export function DepthChart({
  bids,
  classification,
}: {
  bids: Level[];
  classification: string;
}) {
  if (!bids.length) {
    return <p className="chart-empty">No visible bids on this snapshot.</p>;
  }
  let acc = 0;
  const pts = bids.map((lvl) => {
    const px = Number(lvl.price);
    const qty = Number(lvl.quantity);
    const n = Number.isFinite(px) && Number.isFinite(qty) ? px * qty : 0;
    acc += n;
    return { px, acc };
  });
  const maxN = pts[pts.length - 1]?.acc || 1;
  const minP = pts[pts.length - 1]?.px ?? 0;
  const maxP = pts[0]?.px ?? 1;
  const w = 320;
  const h = 120;
  const d = pts
    .map((p, i) => {
      const x = ((p.px - minP) / (maxP - minP || 1)) * (w - 8) + 4;
      const y = h - 8 - (p.acc / maxN) * (h - 16);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Cumulative visible bid notional">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <figcaption>
        Visible exit curve · {classification}
      </figcaption>
    </figure>
  );
}

export function SeriesChart({
  values,
  classification,
  label,
}: {
  values: number[];
  classification: string;
  label: string;
}) {
  if (values.length < 2) {
    return <p className="chart-empty">{label}: need two LIVE observations this session.</p>;
  }
  const w = 320;
  const h = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 8) + 4;
      const y = h - 8 - ((v - min) / (max - min || 1)) * (h - 16);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <figcaption>
        {label} · {classification}
      </figcaption>
    </figure>
  );
}

export function UtilizationBar({ held, capacity }: { held: number | null; capacity: number | null }) {
  if (held == null || capacity == null || capacity <= 0) {
    return <p className="chart-empty">No held notional on this run.</p>;
  }
  const pct = Math.max(0, Math.min(140, (held / capacity) * 100));
  return (
    <div className="util" aria-label="Capacity utilization">
      <span className="util-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      <span className="util-label">
        {pct.toFixed(1)}% of estimated exit capacity
      </span>
    </div>
  );
}
