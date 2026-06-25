import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAnalyze } from "../api/hooks";
import { useScanStore } from "../store/scanStore";
import { analytics } from "../analytics";
import { categoryLabel } from "../constants/categories";
import { palette, spacing, typography } from "../theme";
import type { AnalyzePhoto } from "../api/types";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Processing">;

const TIPS = [
  "COMPARING AGAINST VERIFIED REFERENCE DETAILS…",
  "CHECKING STITCHING, ALIGNMENT AND FINISH…",
  "READING LOGOS, FONTS AND SERIAL MARKINGS…",
  "CROSS-REFERENCING MATERIAL AND TEXTURE…",
];

// Scanning animation + rotating tips while POST /auth/analyze runs (spec §4.5).
export function ProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const scanId = useScanStore((s) => s.scanId);
  const categoryId = useScanStore((s) => s.categoryId);
  const productId = useScanStore((s) => s.productId);
  const identification = useScanStore((s) => s.identification);
  const photos = useScanStore((s) => s.photos);
  const setVerdict = useScanStore((s) => s.setVerdict);

  const analyze = useAnalyze();
  const [tipIndex, setTipIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const pulse = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + pulse.value * 0.15 },
      { rotate: `${pulse.value * 45}deg` },
    ],
    opacity: 1 - pulse.value * 0.4,
  }));

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 2000);
    return () => clearInterval(id);
  }, []);

  const runAnalyze = React.useCallback(async () => {
    if (!scanId || !categoryId) {
      setError("Missing scan context. Please start over.");
      return;
    }
    setError(null);
    const analyzePhotos: AnalyzePhoto[] = photos
      .filter((p) => p.imageKey && p.checkId !== "primary")
      .map((p) => ({ checkId: p.checkId, imageKey: p.imageKey as string }));
    const startedAt = Date.now();
    try {
      const result = await analyze.mutateAsync({
        scanId,
        itemCategory: categoryId,
        productId: productId ?? null,
        photos: analyzePhotos,
      });
      analytics.verdictReceived({
        category: categoryId,
        verdict: result.verdict,
        confidence: result.overallConfidence,
        durationMs: Date.now() - startedAt,
        hardFail: result.hardFailTriggered,
        checkCount: result.checks.length,
      });
      setVerdict(result);
      navigation.replace("Verdict");
    } catch {
      setError("Analysis failed. Check your connection and try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId, categoryId, productId, photos]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runAnalyze();
  }, [runAnalyze]);

  const itemName = identification?.displayName ?? categoryLabel(categoryId ?? "");

  return (
    <Screen title="ANALYZING">
      <View style={styles.center}>
        <Animated.View style={[styles.ring, animStyle]} />
        <Text style={styles.title}>ANALYZING {itemName.toUpperCase()}…</Text>

        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton
              title="Retry"
              onPress={() => {
                analytics.scanRetried("analyze", categoryId ?? null);
                started.current = true;
                runAnalyze();
              }}
            />
            <PrimaryButton
              title="Cancel"
              variant="secondary"
              onPress={() => navigation.navigate("Home")}
            />
          </>
        ) : (
          <Text style={styles.tip}>{TIPS[tipIndex]}</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 0,
    borderWidth: 4,
    borderColor: palette.primary,
  },
  title: { ...typography.heading, color: palette.text, textAlign: "center" },
  tip: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    textTransform: "uppercase",
  },
  error: { ...typography.body, color: palette.text, textAlign: "center", textTransform: "uppercase" },
});
