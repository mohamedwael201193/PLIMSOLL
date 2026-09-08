import { describe, expect, it, vi } from "vitest";
import { classificationLabel, isLiveClaim } from "./labels";
import { tokenGlyph } from "./lib/tokenCandidates";
import { money } from "./lib/money";

describe("classification labels", () => {
  it("never upgrades missing data to LIVE", () => {
    expect(classificationLabel(undefined)).toBe("UNKNOWN");
    expect(isLiveClaim(undefined)).toBe(false);
    expect(isLiveClaim("REPLAY")).toBe(false);
  });

  it("only calls LIVE what the backend labelled LIVE", () => {
    expect(classificationLabel("LIVE")).toBe("LIVE");
    expect(isLiveClaim("LIVE")).toBe(true);
  });
});

describe("token glyph", () => {
  it("keeps unusual tickers and uses two latin letters", () => {
    expect(tokenGlyph("ARKUSDT")).toBe("AR");
    expect(tokenGlyph("BTC")).toBe("BT");
  });
});

describe("money", () => {
  it("does not invent a value for empty input", () => {
    expect(money(undefined)).toBe("n/a");
    expect(money("3303.56")).toBe((3303.56).toLocaleString(undefined, { maximumFractionDigits: 2 }));
  });
});

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

vi.stubGlobal("Image", FakeImage);
