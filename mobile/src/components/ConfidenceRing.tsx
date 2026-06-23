import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { confidenceColor, palette, typography } from "../theme";

interface Props {
  /** 0-100 confidence score. */
  score: number;
  size?: number;
  label?: string;
}

function bucketLabel(score: number): string {
  if (score >= 80) return "High confidence";
  if (score >= 50) return "Medium confidence";
  return "Low confidence";
}

/**
 * Color-coded confidence indicator (build instructions §11.2:
 * green >=80 / yellow 50-79 / red <50). Number + label always shown so the
 * meaning never relies on color alone (spec §12 WCAG AA).
 */
export function ConfidenceRing({ score, size = 96, label }: Props) {
  const color = confidenceColor(score);
  return (
    <View style={styles.wrap}>
      <View
        accessibilityRole="image"
        accessibilityLabel={`${Math.round(score)} percent, ${bucketLabel(score)}`}
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
        ]}
      >
        <Text style={[styles.score, { color }]}>{Math.round(score)}</Text>
        <Text style={styles.pct}>%</Text>
      </View>
      <Text style={[styles.label, { color }]}>{label ?? bucketLabel(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  ring: {
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: palette.surface,
  },
  score: { ...typography.title, fontSize: 30 },
  pct: { ...typography.caption, color: palette.textMuted, marginTop: 6 },
  label: { ...typography.caption, marginTop: 6, fontWeight: "600" },
});
