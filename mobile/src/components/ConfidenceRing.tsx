import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { confidenceColor, palette } from "../theme";

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
export function ConfidenceRing({ score, size = 80, label }: Props) {
  const color = confidenceColor(score);
  return (
    <View style={styles.wrap}>
      <View
        accessibilityRole="image"
        accessibilityLabel={`${Math.round(score)} percent, ${bucketLabel(score)}`}
        style={[
          styles.box,
          { width: size * 1.6, height: size, borderColor: color },
        ]}
      >
        <Text style={[styles.score, { color }]}>{Math.round(score)}</Text>
        <Text style={[styles.pct, { color }]}>%</Text>
      </View>
      <Text style={[styles.label, { color }]}>
        {(label ?? bucketLabel(score)).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  box: {
    borderWidth: 1.5,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: palette.surface,
  },
  score: { fontFamily: "monospace", fontSize: 26, fontWeight: "700" },
  pct: { fontFamily: "monospace", fontSize: 14, fontWeight: "700", marginLeft: 2 },
  label: { fontFamily: "monospace", fontSize: 11, marginTop: 8, fontWeight: "700", letterSpacing: 1 },
});
