import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useScanStore } from "../store/scanStore";
import { getScanWithChecks, saveScan, type CheckRow } from "../db";
import { categoryLabel } from "../constants/categories";
import { palette, spacing, typography, verdictColor, type VerdictKey } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Verdict">;
type Rt = RouteProp<RootStackParamList, "Verdict">;

const DISCLAIMER =
  "Snap Check provides an AI-assisted opinion, not a certified appraisal or legal authentication. Always verify high-value items with a professional service.";

function verdictKey(v: string): VerdictKey {
  const k = v.toLowerCase().replace(/\s+/g, "_");
  if (k in verdictColor) return k as VerdictKey;
  if (k.includes("likely") && k.includes("counter")) return "likely_counterfeit";
  if (k.includes("counter") || k === "fake") return "counterfeit";
  if (k.includes("likely")) return "likely_authentic";
  if (k.includes("authentic")) return "authentic";
  return "inconclusive";
}

function verdictLabel(key: VerdictKey): string {
  return (
    {
      authentic: "AUTHENTIC",
      likely_authentic: "LIKELY AUTHENTIC",
      inconclusive: "INCONCLUSIVE",
      likely_counterfeit: "LIKELY COUNTERFEIT",
      counterfeit: "COUNTERFEIT",
    } as Record<VerdictKey, string>
  )[key];
}

function resultGlyph(result: string): { glyph: string; color: string } {
  const r = result.toLowerCase();
  if (r === "pass") return { glyph: "[PASS]", color: palette.text };
  if (r === "fail") return { glyph: "[FAIL]", color: palette.textMuted };
  return { glyph: "[?]", color: palette.textMuted };
}

interface VerdictView {
  category: string;
  displayName: string;
  verdict: string;
  overallConfidence: number;
  checks: CheckRow[];
  suggested: string[];
  disclaimer: string;
}

// Verdict badge + confidence + expandable evidence + dispute + disclaimer (spec §4.6).
export function VerdictScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const readOnlyId = route.params?.scanId;

  const verdict = useScanStore((s) => s.verdict);
  const identification = useScanStore((s) => s.identification);
  const categoryId = useScanStore((s) => s.categoryId);
  const scanId = useScanStore((s) => s.scanId);
  const primaryPhotoUri = useScanStore((s) => s.primaryPhotoUri);
  const reset = useScanStore((s) => s.reset);

  const [view, setView] = useState<VerdictView | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const saved = useRef(false);

  // Build the view from SQLite (read-only history) or the live store.
  useEffect(() => {
    let active = true;
    (async () => {
      if (readOnlyId) {
        const row = await getScanWithChecks(readOnlyId);
        if (row && active) {
          setView({
            category: row.scan.category,
            displayName: row.scan.display_name ?? categoryLabel(row.scan.category),
            verdict: row.scan.verdict ?? "inconclusive",
            overallConfidence: row.scan.overall_conf ?? 0,
            checks: row.checks,
            suggested: [],
            disclaimer: DISCLAIMER,
          });
        }
        return;
      }
      if (verdict && categoryId) {
        const checks: CheckRow[] = verdict.checks.map((c) => ({
          name: c.name,
          score: c.score,
          result: c.result,
          observation: c.observation,
        }));
        if (active) {
          setView({
            category: categoryId,
            displayName: identification?.displayName ?? categoryLabel(categoryId),
            verdict: verdict.verdict,
            overallConfidence: verdict.overallConfidence,
            checks,
            suggested: verdict.suggestedVerificationServices ?? [],
            disclaimer: verdict.disclaimer || DISCLAIMER,
          });
        }
        // Persist the completed scan once (spec §4.8).
        if (!saved.current && scanId) {
          saved.current = true;
          saveScan({
            id: scanId,
            category: categoryId,
            product: identification?.productLine ?? null,
            displayName: identification?.displayName ?? null,
            thumbnailUri: primaryPhotoUri ?? null,
            verdict: verdict.verdict,
            overallConf: verdict.overallConfidence,
            checks,
          }).catch(() => undefined);
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnlyId, verdict, categoryId]);

  if (!view) {
    return (
      <Screen title="VERDICT">
        <Text style={styles.muted}>No verdict to show.</Text>
        <PrimaryButton title="Back to camera" onPress={() => navigation.navigate("Home")} />
      </Screen>
    );
  }

  const key = verdictKey(view.verdict);
  const color = verdictColor[key];

  const scanAnother = () => {
    reset();
    navigation.navigate("Home");
  };

  return (
    <Screen title="VERDICT RESULT">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, { borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>{verdictLabel(key)}</Text>
          <Text style={styles.badgeSub}>{view.displayName.toUpperCase()}</Text>
          <Text style={[styles.confidence, { color }]}>
            {Math.round(view.overallConfidence)}% OVERALL CONFIDENCE
          </Text>
        </View>

        <Text style={styles.sectionTitle}>EVIDENCE</Text>
        <View style={styles.evidenceTable}>
          {view.checks.map((c, i) => {
            const g = resultGlyph(c.result);
            const open = expanded === i;
            return (
              <Pressable
                key={`${c.name}-${i}`}
                onPress={() => setExpanded(open ? null : i)}
                style={styles.checkRow}
              >
                <View style={styles.checkHead}>
                  <Text style={[styles.glyph, { color: g.color }]}>{g.glyph}</Text>
                  <Text style={styles.checkName}>{c.name.toUpperCase()}</Text>
                  <Text style={styles.checkScore}>{Math.round(c.score)}%</Text>
                </View>
                {open && c.observation ? (
                  <Text style={styles.observation}>{c.observation.toUpperCase()}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.lookFor}>
          <Text style={styles.lookForTitle}>What to look for</Text>
          <Text style={styles.lookForBody}>
            Tap any check above to see what we observed. For high-value items, confirm with a
            professional authentication service
            {view.suggested.length ? `, e.g. ${view.suggested.join(", ")}` : ""}.
          </Text>
        </View>

        <Text style={styles.disclaimer}>{view.disclaimer.toUpperCase()}</Text>

        {!readOnlyId && (
          <PrimaryButton
            title="Dispute this result"
            variant="secondary"
            onPress={() => navigation.navigate("Correction")}
          />
        )}
        <PrimaryButton title="Scan another" onPress={scanAnother} />
        {readOnlyId && (
          <PrimaryButton title="Done" variant="secondary" onPress={() => navigation.goBack()} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  badge: {
    borderWidth: 1.5,
    borderRadius: 0,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    backgroundColor: palette.surface,
  },
  badgeText: { ...typography.title, fontSize: 24 },
  badgeSub: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs, textTransform: "uppercase", fontSize: 12 },
  confidence: { ...typography.heading, marginTop: spacing.sm, textTransform: "uppercase", fontSize: 13, letterSpacing: 0.5 },
  sectionTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.sm, textTransform: "uppercase" },
  evidenceTable: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    marginBottom: spacing.lg,
  },
  checkRow: {
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  checkHead: { flexDirection: "row", alignItems: "center" },
  glyph: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", marginRight: spacing.sm },
  checkName: { ...typography.body, color: palette.text, flex: 1, textTransform: "uppercase", fontSize: 12 },
  checkScore: { ...typography.caption, color: palette.textMuted },
  observation: { ...typography.caption, color: palette.textMuted, marginTop: spacing.sm, textTransform: "uppercase" },
  lookFor: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  lookForTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.xs, textTransform: "uppercase", fontSize: 13 },
  lookForBody: { ...typography.caption, color: palette.textMuted, textTransform: "uppercase" },
  disclaimer: {
    ...typography.caption,
    color: palette.textMuted,
    marginVertical: spacing.md,
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  muted: { ...typography.body, color: palette.textMuted },
});
