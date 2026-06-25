// Color tokens (spec §12: WCAG AA contrast, color always paired with text/icon).

export const palette = {
  bg: "#F5F2EB",       // Warm linen off-white
  surface: "#FFFFFF",  // Card pure white
  surfaceAlt: "#FAF8F5",
  text: "#111111",     // Deep charcoal
  textMuted: "#706F6C", // Mid gray
  border: "#111111",   // Thin black strokes
  primary: "#111111",
  onPrimary: "#FFFFFF",
};

// Monochromatic confidence buckets (high-fashion monochrome styling).
export function confidenceColor(score: number): string {
  if (score >= 80) return "#111111"; // High: Deep black
  if (score >= 50) return "#706F6C"; // Medium: Mid gray
  return "#B0B0B0";                  // Low: Light gray
}

// Verdict badge colors (Grayscale/Monochrome states).
export type VerdictKey =
  | "authentic"
  | "likely_authentic"
  | "inconclusive"
  | "likely_counterfeit"
  | "counterfeit";

export const verdictColor: Record<VerdictKey, string> = {
  authentic: "#111111",
  likely_authentic: "#444444",
  inconclusive: "#706F6C",
  likely_counterfeit: "#9E9E9E",
  counterfeit: "#B0B0B0",
};
