// Color tokens (spec §12: WCAG AA contrast, color always paired with text/icon).

export const palette = {
  bg: "#0E1116",
  surface: "#1A1F27",
  surfaceAlt: "#232A34",
  text: "#F5F7FA",
  textMuted: "#A6B0BE",
  border: "#2E3742",
  primary: "#2F6FED",
  onPrimary: "#FFFFFF",
};

// Confidence ring buckets (build instructions §11.2: green >=80 / yellow 50-79 / red <50).
export function confidenceColor(score: number): string {
  if (score >= 80) return "#1Fae6c";
  if (score >= 50) return "#E0A416";
  return "#D64545";
}

// Verdict badge colors (spec §7 verdict states).
export type VerdictKey =
  | "authentic"
  | "likely_authentic"
  | "inconclusive"
  | "likely_counterfeit"
  | "counterfeit";

export const verdictColor: Record<VerdictKey, string> = {
  authentic: "#1FAE6C",
  likely_authentic: "#5FB97E",
  inconclusive: "#E0A416",
  likely_counterfeit: "#E07A3F",
  counterfeit: "#D64545",
};
