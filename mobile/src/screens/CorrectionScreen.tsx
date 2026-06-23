import React from "react";
import { Text } from "react-native";
import { Screen } from "../components/Screen";
import { palette } from "../theme";

// Phase 10: dispute form -> POST /corrections, optimistic confirm, queue offline (spec §4.7).
export function CorrectionScreen() {
  return (
    <Screen title="Tell us what we got wrong">
      <Text style={{ color: palette.textMuted }}>Correction form (Phase 10).</Text>
    </Screen>
  );
}
