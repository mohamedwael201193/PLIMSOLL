import { NextResponse } from "next/server";
import { getSnapshots } from "@/lib/oregon";

export const dynamic = "force-dynamic";

/** Stored LIVE snapshots only. Empty series if none — never a walkthrough. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "ARKUSDT").toUpperCase();
  try {
    const body = await getSnapshots(symbol);
    const live = (body.observations || []).filter((o) => o.classification === "LIVE");
    return NextResponse.json({
      classification: live.length ? "LIVE" : "UNKNOWN",
      symbol,
      series: [],
      position: 0,
      minCapacity: 0,
      state: "WITHIN_CAPACITY",
      event: live.length ? "STORED LIVE SNAPSHOTS" : "NO SESSION OBSERVATIONS YET",
      observations: live.map((o) => ({
        symbol,
        hash: (o.snapshot_hash || "").slice(0, 18),
        binding: "—",
        classification: o.classification,
        createdAt: o.captured_at || "",
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "history unavailable";
    return NextResponse.json({ error: message, classification: "UNKNOWN", series: [], observations: [] }, { status: 502 });
  }
}
