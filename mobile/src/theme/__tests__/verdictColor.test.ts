import { describe, it, expect } from "@jest/globals";
import { confidenceColor, verdictColor } from "../colors";
import type { VerdictKey } from "../colors";

describe("confidenceColor buckets (build instructions §11.2)", () => {
  it("green at/above 80, yellow 50-79, red below 50", () => {
    expect(confidenceColor(100)).toBe(confidenceColor(80));
    expect(confidenceColor(79)).toBe(confidenceColor(50));
    expect(confidenceColor(0)).toBe(confidenceColor(49));
    // three visually distinct buckets
    expect(new Set([confidenceColor(90), confidenceColor(60), confidenceColor(10)]).size).toBe(3);
  });

  it("clamps gracefully outside 0-100", () => {
    // out-of-range inputs must still map to a defined bucket, never throw/undefined
    expect(typeof confidenceColor(-20)).toBe("string");
    expect(typeof confidenceColor(150)).toBe("string");
    expect(confidenceColor(150)).toBe(confidenceColor(80)); // > max -> green
    expect(confidenceColor(-20)).toBe(confidenceColor(0)); // < min -> red
  });

  it("returns a valid hex color", () => {
    for (const s of [0, 49, 50, 79, 80, 100]) {
      expect(confidenceColor(s)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("verdictColor map (spec §7 verdict states)", () => {
  const keys: VerdictKey[] = [
    "authentic",
    "likely_authentic",
    "inconclusive",
    "likely_counterfeit",
    "counterfeit",
  ];

  it("defines a color for every verdict state", () => {
    for (const k of keys) {
      expect(verdictColor[k]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("uses a distinct color per state", () => {
    const colors = keys.map((k) => verdictColor[k].toLowerCase());
    expect(new Set(colors).size).toBe(keys.length);
  });
});
