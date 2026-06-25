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
import { palette, spacing, typography } from "../theme";

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
    <Screen title="SETTINGS">
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
          onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=SnapCheck%20feedback`)}
        />
        <SettingLink label="Clear scan history" destructive onPress={onClearHistory} />
      </View>

      <View style={styles.card}>
        <View style={[styles.disabledRow, { borderTopWidth: 0 }]}>
          <Text style={styles.disabledText}>Create account</Text>
          <Text style={styles.soon}>Coming soon</Text>
        </View>
        <View style={styles.disabledRow}>
          <Text style={styles.disabledText}>Sign in</Text>
          <Text style={styles.soon}>Coming soon</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>SNAP CHECK v{version}</Text>
        <Text style={styles.powered}>powered by flossin</Text>
      </View>
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
      <Text style={[styles.linkText, destructive && styles.destructive]}>{label.toUpperCase()}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
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
  label: { ...typography.body, color: palette.text, fontWeight: "700", textTransform: "uppercase" },
  hint: { ...typography.caption, color: palette.textMuted, marginTop: 2, textTransform: "uppercase" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  linkText: { ...typography.body, color: palette.text, fontWeight: "700" },
  destructive: { color: palette.textMuted },
  chevron: { ...typography.heading, color: palette.textMuted },
  disabledRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    opacity: 0.5,
  },
  disabledText: { ...typography.body, color: palette.textMuted, textTransform: "uppercase" },
  soon: { ...typography.caption, color: palette.textMuted, textTransform: "uppercase" },
  footer: {
    marginTop: spacing.xl,
    alignItems: "center",
    gap: 2,
  },
  version: { ...typography.caption, color: palette.text, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  powered: { ...typography.caption, color: palette.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10 },
});
