import { NextResponse } from "next/server";
import { z } from "zod";
import { ASSETS, type CapacityConstraints } from "@/lib/capacity";
import { intentText, mapCapacityBody, postIntent } from "@/lib/oregon";

export const dynamic = "force-dynamic";

const constraintsSchema = z.object({
  symbol: z.string().min(4),
  targetNotional: z.number().min(1).max(100_000_000),
  maxExitCostBps: z.number().min(5).max(1000),
  exitHorizonDays: z.number().min(0.25).max(30),
  participationPct: z.number().min(1).max(50),
  bookFractionPct: z.number().min(1).max(100),
});

/** Proxy to Oregon. Never compute capacity in this process. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = constraintsSchema.safeParse(body?.constraints ?? body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid constraints payload" }, { status: 400 });
    }
    if (!ASSETS.some((a) => a.symbol === parsed.data.symbol)) {
      return NextResponse.json({ error: "unsupported symbol" }, { status: 400 });
    }
    const c = parsed.data as CapacityConstraints;
    const { raw } = await postIntent(intentText(c), c);
    return NextResponse.json(mapCapacityBody(raw, c));
  } catch (e) {
    const message = e instanceof Error ? e.message : "capacity resolution failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = constraintsSchema.safeParse({
    symbol: searchParams.get("symbol") ?? "ARKUSDT",
    targetNotional: Number(searchParams.get("target") ?? 10_000),
    maxExitCostBps: Number(searchParams.get("maxExitCostBps") ?? 50),
    exitHorizonDays: Number(searchParams.get("exitHorizonDays") ?? 1),
    participationPct: Number(searchParams.get("participationPct") ?? 10),
    bookFractionPct: Number(searchParams.get("bookFractionPct") ?? 50),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid constraints" }, { status: 400 });
  }
  try {
    const c = parsed.data as CapacityConstraints;
    const { raw } = await postIntent(intentText(c), c);
    return NextResponse.json(mapCapacityBody(raw, c));
  } catch (e) {
    const message = e instanceof Error ? e.message : "capacity resolution failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
