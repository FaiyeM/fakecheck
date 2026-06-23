import { confidenceColor } from "../colors";

describe("confidenceColor", () => {
  it("returns green at or above 80", () => {
    expect(confidenceColor(80)).toBe(confidenceColor(95));
  });

  it("returns distinct buckets for high/mid/low", () => {
    const high = confidenceColor(85);
    const mid = confidenceColor(60);
    const low = confidenceColor(20);
    expect(new Set([high, mid, low]).size).toBe(3);
  });

  it("treats 49 as low and 50 as mid", () => {
    expect(confidenceColor(49)).not.toBe(confidenceColor(50));
  });
});
