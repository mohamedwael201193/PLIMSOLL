import { NextResponse } from "next/server";
import { getTickers } from "@/lib/oregon";
import { ASSETS } from "@/lib/capacity";

export const dynamic = "force-dynamic";

/** Oregon public tickers. On failure: UNKNOWN, no invented prices. */
export async function GET() {
  try {
    const body = await getTickers(ASSETS.map((a) => a.symbol));
    return NextResponse.json({
      rows: body.rows,
      classification: body.classification === "LIVE" ? "LIVE" : "UNKNOWN",
      capturedAt: Date.parse(body.captured_at || "") || Date.now(),
      source: body.source,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "tickers failed";
    return NextResponse.json(
      { rows: [], classification: "UNKNOWN", capturedAt: Date.now(), error: message },
      { status: 503 }
    );
  }
}
