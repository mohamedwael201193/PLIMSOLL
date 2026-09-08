export type SeriesPoint = {
  t: string;
  est: number;
  cost: number;
  time: number;
  classification: string;
  hash?: string;
};

const KEY = "plimsoll.capacity.series";

export function readSeries(symbol: string): SeriesPoint[] {
  try {
    const raw = sessionStorage.getItem(`${KEY}:${symbol}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SeriesPoint[];
    return Array.isArray(parsed) ? parsed.slice(-48) : [];
  } catch {
    return [];
  }
}

export function pushSeries(symbol: string, point: SeriesPoint): SeriesPoint[] {
  const next = [...readSeries(symbol), point].slice(-48);
  try {
    sessionStorage.setItem(`${KEY}:${symbol}`, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
