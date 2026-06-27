import * as sink from "./client";
import {
  correctionDirection,
  type EventProps,
  type AnalyticsEventName,
} from "./events";

export { initAnalytics, analyticsEnabled } from "./client";
export { correctionDirection } from "./events";
export type { CorrectionDirection } from "./events";

function track<E extends AnalyticsEventName>(event: E, props: EventProps[E]): void {
  sink.capture(event, props);
}

/** Tie events to the anonymous device id (no login). */
function identify(deviceId: string): void {
  sink.identify(deviceId);
}

// Typed facade — one method per product metric (spec §15). Call sites stay
// terse and can't pass the wrong properties for an event.
export const analytics = {
  identify,

  appOpened: () => track("app_opened", {}),
  scanStarted: () => track("scan_started", {}),

  itemIdentified: (category: string, product: string | null, confidence: number) =>
    track("item_identified", { category, product, confidence }),

  identifyCompleted: (p: EventProps["identify_completed"]) =>
    track("identify_completed", p),

  fakeCheckStarted: (category: string, product: string | null) =>
    track("fake_check_started", { category, product }),

  authStepsViewed: (category: string, stepCount: number) =>
    track("auth_steps_viewed", { category, stepCount }),

  authStepCompleted: (
    category: string,
    checkId: string,
    stepIndex: number,
    requirement: string
  ) => track("auth_step_completed", { category, checkId, stepIndex, requirement }),

  authStepSkipped: (
    category: string,
    checkId: string,
    stepIndex: number,
    requirement: string
  ) => track("auth_step_skipped", { category, checkId, stepIndex, requirement }),

  verdictReceived: (p: EventProps["verdict_received"]) => track("verdict_received", p),

  scanRetried: (stage: string, category: string | null) =>
    track("scan_retried", { stage, category }),

  correctionSubmitted: (category: string, aiVerdict: string, userVerdict: string) =>
    track("correction_submitted", {
      category,
      aiVerdict,
      userVerdict,
      direction: correctionDirection(aiVerdict, userVerdict),
    }),
};
