import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { CameraCapture } from "../components/CameraCapture";
import { PrimaryButton } from "../components/PrimaryButton";
import { useScanStore } from "../store/scanStore";
import { uploadImageAsync } from "../api/upload";
import { palette, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "GuidedSteps">;

// Per-step guided capture: progress, instruction, reference, tip, skip-if-optional (spec §4.4).
export function GuidedStepsScreen() {
  const navigation = useNavigation<Nav>();
  const steps = useScanStore((s) => s.steps);
  const addPhoto = useScanStore((s) => s.addPhoto);

  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...steps].sort((a, b) => a.ordinal - b.ordinal),
    [steps]
  );
  const step = ordered[index];
  const isLast = index >= ordered.length - 1;
  const canSkip = step && step.requirement !== "required";

  const advance = () => {
    if (isLast) {
      navigation.navigate("Processing");
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleCapture = async (uri: string) => {
    if (!step) return;
    setBusy(true);
    setError(null);
    try {
      const imageKey = await uploadImageAsync(uri);
      addPhoto({ checkId: step.checkId, localUri: uri, imageKey });
      advance();
    } catch {
      setError("Upload failed. Check your connection and retake this photo.");
    } finally {
      setBusy(false);
    }
  };

  if (!step) {
    return (
      <Screen title="Photos">
        <Text style={styles.muted}>No photo steps loaded. Go back and try again.</Text>
        <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const progress = index / ordered.length;

  return (
    <View style={styles.root}>
      <CameraCapture
        busy={busy}
        onCapture={handleCapture}
        overlay={
          <SafeAreaView style={styles.overlay} pointerEvents="box-none">
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.counter}>
              Step {index + 1} of {ordered.length}
              {step.requirement !== "required" ? `  ·  ${step.requirement}` : ""}
            </Text>

            <View style={styles.card}>
              <Text style={styles.title}>{step.instructionTitle}</Text>
              {step.referenceImageUrl ? (
                <Image
                  source={{ uri: step.referenceImageUrl }}
                  style={styles.reference}
                  resizeMode="cover"
                />
              ) : null}
              {step.tipText ? <Text style={styles.tip}>{step.tipText}</Text> : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {canSkip ? (
              <Pressable
                accessibilityRole="button"
                onPress={advance}
                disabled={busy}
                style={styles.skip}
              >
                <Text style={styles.skipText}>Skip this optional step</Text>
              </Pressable>
            ) : null}
          </SafeAreaView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, padding: spacing.md },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: palette.primary },
  counter: { ...typography.caption, color: "#fff", marginTop: spacing.sm, fontWeight: "600" },
  card: {
    marginTop: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  title: { ...typography.heading, color: "#fff" },
  reference: {
    width: "100%",
    height: 120,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    backgroundColor: palette.surface,
  },
  tip: { ...typography.caption, color: "#D7DEE8", marginTop: spacing.sm },
  error: { ...typography.caption, color: "#FF8A8A", marginTop: spacing.sm },
  skip: { alignSelf: "center", marginTop: spacing.sm, padding: spacing.sm },
  skipText: { ...typography.body, color: "#fff", textDecorationLine: "underline" },
  muted: { ...typography.body, color: palette.textMuted },
});
