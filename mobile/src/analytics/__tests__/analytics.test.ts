import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { correctionDirection } from "../events";
import { analytics } from "../index";
import { __setClientForTests, capture } from "../client";

describe("correctionDirection", () => {
  it("flags a false positive when AI cried counterfeit but item is authentic", () => {
    expect(correctionDirection("likely_counterfeit", "authentic")).toBe("false_positive");
    expect(correctionDirection("counterfeit", "authentic")).toBe("false_positive");
  });

  it("flags a false negative when AI passed a fake", () => {
    expect(correctionDirection("likely_authentic", "fake")).toBe("false_negative");
    expect(correctionDirection("authentic", "fake")).toBe("false_negative");
  });

  it("marks agreement as confirmed", () => {
    expect(correctionDirection("counterfeit", "fake")).toBe("confirmed");
    expect(correctionDirection("authentic", "authentic")).toBe("confirmed");
  });

  it("treats an inconclusive AI verdict as clarified", () => {
    expect(correctionDirection("inconclusive", "fake")).toBe("clarified");
    expect(correctionDirection("inconclusive", "authentic")).toBe("clarified");
  });

  it("returns unsure when the user is unsure regardless of AI verdict", () => {
    expect(correctionDirection("counterfeit", "unsure")).toBe("unsure");
    expect(correctionDirection("authentic", "unsure")).toBe("unsure");
  });
});

describe("capture", () => {
  beforeEach(() => __setClientForTests(null));

  it("is a safe no-op when no client is configured", () => {
    expect(() => capture("app_opened", {})).not.toThrow();
  });

  it("never lets a throwing client surface to the caller", () => {
    __setClientForTests({
      capture: () => {
        throw new Error("network down");
      },
      identify: () => {
        throw new Error("network down");
      },
    });
    expect(() => capture("verdict_received", { x: 1 })).not.toThrow();
  });
});

describe("analytics facade", () => {
  it("forwards typed events to the client with the right name and props", () => {
    const calls: { event: string; props?: Record<string, unknown> }[] = [];
    __setClientForTests({
      capture: (event, props) => calls.push({ event, props }),
      identify: jest.fn() as unknown as (id: string) => void,
    });

    analytics.verdictReceived({
      category: "sneaker",
      verdict: "likely_authentic",
      confidence: 88,
      durationMs: 4210,
      hardFail: false,
      checkCount: 6,
    });
    analytics.correctionSubmitted("watch", "counterfeit", "authentic");

    expect(calls[0].event).toBe("verdict_received");
    expect(calls[0].props).toMatchObject({ category: "sneaker", durationMs: 4210 });
    expect(calls[1].event).toBe("correction_submitted");
    expect(calls[1].props).toMatchObject({ direction: "false_positive" });
  });
});
