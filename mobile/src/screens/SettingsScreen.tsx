import React, { useEffect } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Screen } from "../components/Screen";
import { clearScans } from "../db";
import { useSettingsStore } from "../store/settingsStore";
import { palette, radius, spacing, typography } from "../theme";

const PRIVACY_URL = "https://fakecheck.app/privacy";
const TERMS_URL = "https://fakecheck.app/terms";
const FEEDBACK_EMAIL = "feedback@fakecheck.app";

// Camera quality, clear history, privacy/terms, version, feedback, disabled auth (spec §4.9).
export function SettingsScreen() {
  const cameraQuality = useSettingsStore((s) => s.cameraQuality);
  const setCameraQuality = useSettingsStore((s) => s.setCameraQuality);
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const onClearHistory = () => {
    Alert.alert("Clear history?", "This permanently deletes all locally stored scans.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () =>
          clearScans()
            .then(() => Alert.alert("Done", "Your scan history was cleared."))
            .catch(() => Alert.alert("Error", "Couldn't clear history.")),
      },
    ]);
  };

  const version = Constants.expoConfig?.version ?? "0.0.0";

  return (
    <Screen title="Settings">
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowText}>
            <Text style={styles.label}>High-quality camera</Text>
            <Text style={styles.hint}>Sharper photos, slightly larger uploads.</Text>
          </View>
          <Switch
            value={cameraQuality === "high"}
            onValueChange={(v) => setCameraQuality(v ? "high" : "standard")}
            trackColor={{ true: palette.primary, false: palette.border }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <SettingLink label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
        <SettingLink label="Terms of service" onPress={() => Linking.openURL(TERMS_URL)} />
        <SettingLink
          label="Send feedback"
          onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=FakeCheck%20feedback`)}
        />
        <SettingLink label="Clear scan history" destructive onPress={onClearHistory} />
      </View>

      <View style={styles.card}>
        <View style={styles.disabledRow}>
          <Text style={styles.disabledText}>Create account</Text>
          <Text style={styles.soon}>Coming soon</Text>
        </View>
        <View style={styles.disabledRow}>
          <Text style={styles.disabledText}>Sign in</Text>
          <Text style={styles.soon}>Coming soon</Text>
        </View>
      </View>

      <Text style={styles.version}>FakeCheck v{version}</Text>
    </Screen>
  );
}

function SettingLink({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Text style={[styles.linkText, destructive && styles.destructive]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, paddingRight: spacing.md },
  label: { ...typography.body, color: palette.text },
  hint: { ...typography.caption, color: palette.textMuted, marginTop: 2 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  linkText: { ...typography.body, color: palette.text },
  destructive: { color: "#D64545" },
  chevron: { ...typography.heading, color: palette.textMuted },
  disabledRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    opacity: 0.5,
  },
  disabledText: { ...typography.body, color: palette.text },
  soon: { ...typography.caption, color: palette.textMuted },
  version: { ...typography.caption, color: palette.textMuted, textAlign: "center", marginTop: spacing.sm },
});
