import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { ConfidenceRing } from "../components/ConfidenceRing";
import { PrimaryButton } from "../components/PrimaryButton";
import { useScanStore } from "../store/scanStore";
import { useCreateScan, useIdentify } from "../api/hooks";
import { uploadImageAsync } from "../api/upload";
import { getDeviceId } from "../api/deviceId";
import { CATEGORIES, categoryLabel } from "../constants/categories";
import { palette, radius, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "IdentificationResult">;

// Photo + name + category + confidence ring + manual picker + Check-if-Fake (spec §4.2).
export function IdentificationResultScreen() {
  const navigation = useNavigation<Nav>();
  const primaryPhotoUri = useScanStore((s) => s.primaryPhotoUri);
  const identification = useScanStore((s) => s.identification);
  const categoryId = useScanStore((s) => s.categoryId);
  const setIdentification = useScanStore((s) => s.setIdentification);
  const setCategory = useScanStore((s) => s.setCategory);
  const addPhoto = useScanStore((s) => s.addPhoto);
  const setScanId = useScanStore((s) => s.setScanId);

  const identify = useIdentify();
  const createScan = useCreateScan();
  const [showPicker, setShowPicker] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!primaryPhotoUri || identification) return;
      try {
        setError(null);
        const imageKey = await uploadImageAsync(primaryPhotoUri);
        addPhoto({ checkId: "primary", localUri: primaryPhotoUri, imageKey });
        const result = await identify.mutateAsync(imageKey);
        if (active) setIdentification(result);
      } catch {
        if (active) setError("We couldn't analyze that photo. Try again with better lighting.");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryPhotoUri]);

  const startAuth = async () => {
    if (!categoryId) return;
    setStarting(true);
    try {
      const deviceId = await getDeviceId();
      const { scanId } = await createScan.mutateAsync({
        deviceId,
        category: categoryId,
        product: identification?.productLine ?? null,
      });
      setScanId(scanId);
      navigation.navigate("AuthIntro");
    } catch {
      setError("Couldn't start the check. Check your connection and retry.");
    } finally {
      setStarting(false);
    }
  };

  if (!primaryPhotoUri) {
    return (
      <Screen title="Identification">
        <Text style={styles.muted}>No photo captured. Go back and scan an item.</Text>
        <PrimaryButton title="Back to camera" onPress={() => navigation.navigate("Home")} />
      </Screen>
    );
  }

  const loading = identify.isPending || (!identification && !error);
  const conf = identification?.confidence ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: primaryPhotoUri }} style={styles.photo} />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.muted}>Identifying…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton title="Scan again" onPress={() => navigation.navigate("Home")} />
          </View>
        ) : (
          <>
            <Text style={styles.name}>{identification?.displayName}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{categoryLabel(categoryId ?? "")}</Text>
            </View>

            <View style={styles.ringWrap}>
              <ConfidenceRing score={conf} />
            </View>

            {conf < 40 && (
              <Text style={styles.warn}>
                Low confidence — a clearer, well-lit photo will improve results.
              </Text>
            )}

            <Pressable onPress={() => setShowPicker((v) => !v)}>
              <Text style={styles.link}>Not what you have? Choose the category</Text>
            </Pressable>

            {showPicker && (
              <View style={styles.pickerRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCategory(c.id, null);
                      setShowPicker(false);
                    }}
                    style={[styles.chip, categoryId === c.id && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>
                      {c.emoji} {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <PrimaryButton
              title="Check if Fake"
              onPress={startAuth}
              loading={starting}
              disabled={!categoryId}
            />
            <PrimaryButton
              title="Scan again"
              variant="secondary"
              onPress={() => navigation.navigate("Home")}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  photo: { width: "100%", height: 240, borderRadius: radius.md, backgroundColor: palette.surface },
  centered: { alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  name: { ...typography.title, color: palette.text, marginTop: spacing.md, textAlign: "center" },
  tag: {
    alignSelf: "center",
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  tagText: { ...typography.caption, color: palette.textMuted },
  ringWrap: { alignItems: "center", marginVertical: spacing.lg },
  warn: { ...typography.caption, color: "#E0A416", textAlign: "center", marginBottom: spacing.sm },
  link: { ...typography.body, color: palette.primary, textAlign: "center", marginVertical: spacing.sm },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: palette.primary, backgroundColor: palette.surfaceAlt },
  chipText: { ...typography.caption, color: palette.text },
  muted: { ...typography.body, color: palette.textMuted, textAlign: "center" },
  error: { ...typography.body, color: "#D64545", textAlign: "center" },
});
