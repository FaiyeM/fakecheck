import React from "react";
import { Text } from "react-native";
import { Screen } from "../components/Screen";
import { palette } from "../theme";

// Phase 10: chronological list from local SQLite + filter + search (spec §4.8).
export function HistoryScreen() {
  return (
    <Screen title="History">
      <Text style={{ color: palette.textMuted }}>Local scan history (Phase 10/11).</Text>
    </Screen>
  );
}
