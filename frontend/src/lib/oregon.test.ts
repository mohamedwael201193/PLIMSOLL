import { describe, expect, it } from "vitest";
import { DEFAULT_CONSTRAINTS } from "./capacity";
import { intentText, mapCapacityBody, oauthStartUrl } from "./oregon";

describe("mapCapacityBody", () => {
  it("maps Oregon LIVE intent payload without inventing capacity", () => {
    const mapped = mapCapacityBody(
      {
        classification: "LIVE",
        snapshot_hash: "abc123deadbeef",
        captured_at: "2026-09-08T00:00:00+00:00",
        source: "https://data-api.binance.vision",
        decision: {
          action: "SIZE_DOWN",
          requested_notional: "10000",
          reason: "estimated exit capacity under stated constraints",
          capacity: {
            estimated_exit_capacity_notional: "3430.5",
            cost_capacity_notional: "9000",
            time_capacity_notional: "3430.5",
            visible_exit_book_notional: "20000",
            fraction_applied: "0.5",
            binding: "TIME",
          },
        },
        market: {
          symbol: "ARKUSDT",
          last_price: "0.1157",
          best_bid: "0.1156",
          best_ask: "0.1158",
          quote_volume_24h: "43200",
        },
      },
      DEFAULT_CONSTRAINTS
    );
    expect(mapped.classification).toBe("LIVE");
    expect(mapped.exitCapacity).toBe(3430.5);
    expect(mapped.binding).toBe("TIME");
    expect(mapped.recommendation).toBe("SIZE_DOWN");
    expect(mapped.status).toBe("OVER_CAPACITY");
    expect(mapped.snapshot.hash).toBe("abc123deadbeef");
  });

  it("maps FILL_AS_ASKED when requested is inside capacity", () => {
    const mapped = mapCapacityBody(
      {
        classification: "LIVE",
        snapshot_hash: "hash",
        decision: {
          action: "FILL_AS_ASKED",
          requested_notional: "1000",
          capacity: {
            estimated_exit_capacity_notional: "4000",
            cost_capacity_notional: "5000",
            time_capacity_notional: "4000",
            visible_exit_book_notional: "10000",
            fraction_applied: "0.5",
            binding: "TIME",
          },
        },
        market: { symbol: "ARKUSDT", last_price: "1" },
      },
      { ...DEFAULT_CONSTRAINTS, targetNotional: 1000 }
    );
    expect(mapped.recommendation).toBe("FILL_AS_ASKED");
    expect(mapped.status).toBe("WITHIN_CAPACITY");
  });
});

describe("intentText", () => {
  it("states the $1000 / one day ask literally", () => {
    expect(intentText({ ...DEFAULT_CONSTRAINTS, targetNotional: 1000 })).toBe(
      "I want $1000 of ARK and need to exit within one day."
    );
  });
});

describe("oauthStartUrl", () => {
  it("points TRY WEB AUTHORIZE at Oregon OAuth without embedding a token", () => {
    const url = oauthStartUrl("https://plimsoll-jade.vercel.app");
    expect(url).toContain("/v1/oauth/start?return=");
    expect(url).toContain("plimsoll-jade.vercel.app");
    expect(url.toLowerCase()).not.toContain("token");
  });
});
