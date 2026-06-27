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
import { analytics } from "../analytics";
import { CATEGORIES, categoryLabel } from "../constants/categories";
import { palette, spacing, typography } from "../theme";
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
        analytics.scanStarted();
        const imageKey = await uploadImageAsync(primaryPhotoUri);
        addPhoto({ checkId: "primary", localUri: primaryPhotoUri, imageKey });
        const result = await identify.mutateAsync(imageKey);
        if (active) {
          setIdentification(result);
          analytics.itemIdentified(
            result.category,
            result.productLine ?? null,
            result.confidence
          );
          analytics.identifyCompleted({
            category: result.category,
            imageCount: 1, // single-image identify today; §2 multi-image makes this dynamic
            confidence: result.confidence,
            band: null, // §2 confidence policy will populate the band
          });
        }
      } catch (e) {
        // TEMP diagnostic: surface the real failure (upload status/body or identify error)
        // instead of the generic lighting message, so we can see why scans fail on device.
        if (active) setError(`Scan failed: ${e instanceof Error ? e.message : String(e)}`);
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
      analytics.fakeCheckStarted(categoryId, identification?.productLine ?? null);
      navigation.navigate("AuthIntro");
    } catch {
      setError("Couldn't start the check. Check your connection and retry.");
    } finally {
      setStarting(false);
    }
  };

  if (!primaryPhotoUri) {
    return (
      <Screen title="IDENTIFY">
        <Text style={styles.muted}>No photo captured. Go back and scan an item.</Text>
        <PrimaryButton title="Back to camera" onPress={() => navigation.navigate("Home")} />
      </Screen>
    );
  }

  const loading = identify.isPending || (!identification && !error);
  const conf = identification?.confidence ?? 0;
  const isSupported = categoryId === "sneaker" || categoryId === "handbag" || categoryId === "pokemon" || categoryId === "watch";

  return (
    <Screen title="RESULT">
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

            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>BRAND</Text>
                <Text style={styles.metaValue}>{(identification?.brand ?? "UNKNOWN").toUpperCase()}</Text>
              </View>
              {identification?.model ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>MODEL</Text>
                  <Text style={styles.metaValue}>{identification.model.toUpperCase()}</Text>
                </View>
              ) : null}
              {identification?.year ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>RELEASE YEAR</Text>
                  <Text style={styles.metaValue}>{identification.year.toUpperCase()}</Text>
                </View>
              ) : null}
              {identification?.retailPrice ? (
                <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.metaLabel}>RETAIL PRICE</Text>
                  <Text style={styles.metaValue}>{identification.retailPrice.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.ringWrap}>
              <ConfidenceRing score={conf} />
            </View>

            {conf < 40 && (
              <Text style={styles.warn}>
                Low confidence — a clearer, well-lit photo will improve results.
              </Text>
            )}

            {!isSupported && (
              <Text style={styles.notSupported}>
                SNAP CHECK IS NOT SUPPORTED FOR THIS CATEGORY. CHOOSE AN OVERRIDE CATEGORY BELOW TO ENABLE AUTHENTICITY SCAN.
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
                    <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                      {c.emoji} {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <PrimaryButton
              title="START SNAP CHECK"
              onPress={startAuth}
              loading={starting}
              disabled={!categoryId || !isSupported}
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
  photo: { width: "100%", height: 240, borderWidth: 1.5, borderColor: palette.border, borderRadius: 0, backgroundColor: palette.surface },
  centered: { alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  name: { ...typography.title, color: palette.text, marginTop: spacing.md, textAlign: "center" },
  tag: {
    alignSelf: "center",
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  tagText: { ...typography.caption, color: palette.text, textTransform: "uppercase" },
  metaCard: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,17,17,0.15)",
  },
  metaLabel: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    color: palette.textMuted,
  },
  metaValue: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    color: palette.text,
    textAlign: "right",
    flex: 1,
    paddingLeft: spacing.md,
  },
  ringWrap: { alignItems: "center", marginVertical: spacing.lg },
  warn: { ...typography.caption, color: palette.textMuted, textAlign: "center", marginBottom: spacing.sm, textTransform: "uppercase" },
  notSupported: {
    ...typography.caption,
    color: palette.text,
    textAlign: "center",
    marginVertical: spacing.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    borderWidth: 1.5,
    borderColor: palette.border,
    padding: spacing.sm,
    lineHeight: 16,
  },
  link: { ...typography.body, color: palette.text, textDecorationLine: "underline", textAlign: "center", marginVertical: spacing.sm, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  chip: {
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "transparent",
  },
  chipActive: { borderColor: palette.border, backgroundColor: palette.primary },
  chipText: { ...typography.caption, color: palette.text, textTransform: "uppercase", letterSpacing: 0.5 },
  chipTextActive: { color: palette.onPrimary },
  muted: { ...typography.body, color: palette.textMuted, textAlign: "center", textTransform: "uppercase" },
  error: { ...typography.body, color: palette.text, textAlign: "center", textTransform: "uppercase" },
});
