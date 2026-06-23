import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useSubmitCorrection } from "../api/hooks";
import { uploadImagesAsync } from "../api/upload";
import { useScanStore } from "../store/scanStore";
import { markDisputedAndQueue } from "../db";
import { palette, radius, spacing, typography } from "../theme";
import type { CorrectionRequest } from "../api/types";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Correction">;
type Choice = "authentic" | "fake" | "unsure";
const MIN = 20;
const MAX = 500;
const CHOICES: { id: Choice; label: string }[] = [
  { id: "authentic", label: "It's Authentic" },
  { id: "fake", label: "It's Fake" },
  { id: "unsure", label: "Not sure" },
];

// Dispute form -> POST /corrections, optimistic confirm + offline queue (spec §4.7, §12.5).
export function CorrectionScreen() {
  const navigation = useNavigation<Nav>();
  const scanId = useScanStore((s) => s.scanId);
  const verdict = useScanStore((s) => s.verdict);
  const categoryId = useScanStore((s) => s.categoryId);
  const productId = useScanStore((s) => s.productId);
  const photos = useScanStore((s) => s.photos);

  const submit = useSubmitCorrection();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState("");
  const [supporting, setSupporting] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const addPhoto = async () => {
    if (supporting.length >= 3) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled && res.assets[0]?.uri) {
      setSupporting((s) => [...s, res.assets[0].uri]);
    }
  };

  const valid = choice && reason.trim().length >= MIN && reason.trim().length <= MAX;

  const onSubmit = async () => {
    if (!valid || !scanId || !categoryId) return;
    setBusy(true);
    try {
      const supportingImageUrls = supporting.length ? await uploadImagesAsync(supporting) : [];
      const body: CorrectionRequest = {
        scanId,
        userCorrection: choice as Choice,
        explanation: reason.trim(),
        supportingImageUrls,
        originalVerdict: verdict?.verdict ?? "inconclusive",
        originalConfidence: verdict?.overallConfidence ?? 0,
        itemCategory: categoryId,
        productId: productId ?? null,
        originalChecks: (verdict?.checks ?? []).map((c) => ({
          checkId: c.name,
          score: c.score,
          result: c.result,
          observation: c.observation,
        })),
        allScanImageUrls: photos.map((p) => p.imageKey).filter((k): k is string => !!k),
        appVersion: Constants.expoConfig?.version ?? "0.0.0",
        platform: Platform.OS,
      };

      // Optimistic: tag the scan disputed + queue locally first (survives offline).
      await markDisputedAndQueue(scanId, JSON.stringify(body));
      try {
        await submit.mutateAsync(body);
      } catch {
        // Stays queued; Phase 11 flush retries on reconnect.
      }

      Alert.alert("Thanks", "Your correction was submitted. We use it to improve FakeCheck.", [
        { text: "OK", onPress: () => navigation.navigate("Home") },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const remaining = MAX - reason.length;

  return (
    <Screen title="Tell us what we got wrong">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.original}>
          Original result: {verdict?.verdict ?? "—"} ({Math.round(verdict?.overallConfidence ?? 0)}%)
        </Text>

        <Text style={styles.label}>What&apos;s the correct verdict?</Text>
        <View style={styles.choices}>
          {CHOICES.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setChoice(c.id)}
              style={[styles.choice, choice === c.id && styles.choiceActive]}
            >
              <Text style={[styles.choiceText, choice === c.id && styles.choiceTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Why? ({MIN}–{MAX} characters)</Text>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={(t) => setReason(t.slice(0, MAX))}
          placeholder="Tell us what looked wrong and how you know…"
          placeholderTextColor={palette.textMuted}
          multiline
        />
        <Text style={styles.counter}>
          {reason.trim().length < MIN
            ? `${MIN - reason.trim().length} more characters needed`
            : `${remaining} characters left`}
        </Text>

        <Text style={styles.label}>Supporting photos (optional, up to 3)</Text>
        <View style={styles.photoRow}>
          {supporting.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.thumb} />
          ))}
          {supporting.length < 3 && (
            <Pressable onPress={addPhoto} style={styles.addPhoto}>
              <Text style={styles.addPhotoText}>＋</Text>
            </Pressable>
          )}
        </View>

        <PrimaryButton title="Submit correction" onPress={onSubmit} disabled={!valid} loading={busy} />
        <PrimaryButton title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  original: { ...typography.caption, color: palette.textMuted, marginBottom: spacing.md },
  label: { ...typography.body, color: palette.text, marginTop: spacing.md, marginBottom: spacing.sm },
  choices: { flexDirection: "row", gap: spacing.sm },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  choiceActive: { borderColor: palette.primary, backgroundColor: palette.surfaceAlt },
  choiceText: { ...typography.caption, color: palette.textMuted },
  choiceTextActive: { color: palette.text, fontWeight: "700" },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: palette.text,
    textAlignVertical: "top",
    ...typography.body,
  },
  counter: { ...typography.caption, color: palette.textMuted, marginTop: spacing.xs },
  photoRow: { flexDirection: "row", gap: spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: palette.surface },
  addPhoto: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: { fontSize: 28, color: palette.textMuted },
});
