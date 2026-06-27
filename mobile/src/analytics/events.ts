// Product-metrics event contract (spec §15). Each key is a PostHog event name;
// its value type is the exact property bag that event must carry. Keeping the
// contract here makes every call site type-checked and the taxonomy reviewable
// in one place.

export type CorrectionDirection =
  | "false_positive" // AI said counterfeit, user says authentic
  | "false_negative" // AI said authentic, user says fake
  | "confirmed" // user agrees with the AI verdict
  | "clarified" // AI was inconclusive, user supplied ground truth
  | "unsure"; // user is not sure either

export interface EventProps {
  app_opened: Record<string, never>;
  // Funnel: scan_started -> item_identified -> fake_check_started -> verdict_received.
  scan_started: Record<string, never>;
  item_identified: { category: string; product: string | null; confidence: number };
  // Usage metering (spec §7): emitted once per successful identify so identifies
  // -per-subject-per-day can be charted and the free caps (§6) made evidence-based.
  // `band` is the §2 confidence band ("Best guess"/"Confident"); null until §2 lands.
  identify_completed: {
    category: string;
    imageCount: number;
    confidence: number;
    band: string | null;
  };
  fake_check_started: { category: string; product: string | null };
  auth_steps_viewed: { category: string; stepCount: number };
  auth_step_completed: {
    category: string;
    checkId: string;
    stepIndex: number;
    requirement: string;
  };
  auth_step_skipped: {
    category: string;
    checkId: string;
    stepIndex: number;
    requirement: string;
  };
  // durationMs = time-to-verdict (analyze request latency).
  verdict_received: {
    category: string;
    verdict: string;
    confidence: number;
    durationMs: number;
    hardFail: boolean;
    checkCount: number;
  };
  scan_retried: { stage: string; category: string | null };
  correction_submitted: {
    category: string;
    aiVerdict: string;
    userVerdict: string;
    direction: CorrectionDirection;
  };
}

export type AnalyticsEventName = keyof EventProps;

/** Map an AI verdict + user correction to a learning-loop direction label. */
export function correctionDirection(
  aiVerdict: string,
  userVerdict: string
): CorrectionDirection {
  const u = userVerdict.toLowerCase();
  if (u === "unsure" || u === "not_sure") return "unsure";

  const a = aiVerdict.toLowerCase();
  const aiCounterfeit = a.includes("counter") || a.includes("fake");
  const aiAuthentic = a.includes("authentic");
  const aiInconclusive = !aiCounterfeit && !aiAuthentic;

  if (aiInconclusive) return "clarified";

  const userFake = u === "fake";
  const userAuthentic = u === "authentic";

  if (aiCounterfeit && userAuthentic) return "false_positive";
  if (aiAuthentic && userFake) return "false_negative";
  if ((aiCounterfeit && userFake) || (aiAuthentic && userAuthentic)) return "confirmed";
  return "clarified";
}
