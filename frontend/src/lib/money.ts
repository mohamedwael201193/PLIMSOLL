export function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === "") return "n/a";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function compact(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === "") return "n/a";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function ageLabel(iso: string | undefined | null): string {
  if (!iso) return "no snapshot";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "no snapshot";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}
