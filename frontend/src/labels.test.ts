import { describe, expect, it } from "vitest";
import { classificationLabel, isLiveClaim } from "./labels";

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
