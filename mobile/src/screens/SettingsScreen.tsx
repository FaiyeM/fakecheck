import React from "react";
import { Text } from "react-native";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import { API_BASE_URL } from "../api/client";

// Phase 10: camera quality, clear history, privacy/terms, version, disabled auth placeholders (spec §4.9).
export function SettingsScreen() {
  return (
    <Screen title="Settings">
      <Text style={{ color: palette.textMuted }}>Settings (Phase 10).</Text>
      <Text style={{ color: palette.textMuted }}>API: {API_BASE_URL}</Text>
    </Screen>
  );
}
