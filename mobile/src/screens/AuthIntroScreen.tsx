import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useCategorySteps } from "../api/hooks";
import { useScanStore } from "../store/scanStore";
import { categoryLabel } from "../constants/categories";
import { palette, spacing, typography } from "../theme";
import type { StepDto } from "../api/types";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "AuthIntro">;

// Confirmed item, "N more photos, ~60-90s", preview of steps, Start/Not now (spec §4.3).
export function AuthIntroScreen() {
  const navigation = useNavigation<Nav>();
  const categoryId = useScanStore((s) => s.categoryId);
  const identification = useScanStore((s) => s.identification);
  const setSteps = useScanStore((s) => s.setSteps);

  const { data: steps, isPending, isError, refetch } = useCategorySteps(categoryId);

  useEffect(() => {
    if (steps) setSteps(steps);
  }, [steps, setSteps]);

  const itemName = identification?.displayName ?? categoryLabel(categoryId ?? "");
  const count = steps?.length ?? 0;

  return (
    <Screen title="VERIFICATION">
      <Text style={styles.item}>{itemName}</Text>

      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.error}>Couldn&apos;t load the photo steps.</Text>
          <PrimaryButton title="Retry" onPress={() => refetch()} />
        </View>
      ) : (
        <>
          <Text style={styles.lead}>
            {count} MORE PHOTO{count === 1 ? "" : "S"} — APPROX. 60–90 SECONDS.
          </Text>
          <Text style={styles.subhead}>GUIDED STEPS (ALL OPTIONAL):</Text>

          <FlatList
            data={steps}
            keyExtractor={(s) => String(s.id)}
            style={styles.list}
            renderItem={({ item, index }: { item: StepDto; index: number }) => (
              <View style={styles.row}>
                <View style={styles.bullet}>
                  <Text style={styles.bulletText}>{index + 1}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.instructionTitle.toUpperCase()}</Text>
                  <Text style={styles.optional}>OPTIONAL</Text>
                </View>
              </View>
            )}
          />

          <PrimaryButton
            title="Start"
            onPress={() => navigation.navigate("GuidedSteps")}
            disabled={count === 0}
          />
          <PrimaryButton
            title="Not now"
            variant="secondary"
            onPress={() => navigation.navigate("Home")}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { ...typography.heading, color: palette.text, marginBottom: spacing.sm, textTransform: "uppercase" },
  lead: { ...typography.body, color: palette.text, marginBottom: spacing.xs, fontWeight: "700" },
  subhead: { ...typography.caption, color: palette.textMuted, marginBottom: spacing.sm },
  list: { flexGrow: 0, marginBottom: spacing.md, borderTopWidth: 1, borderTopColor: palette.border },
  centered: { alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.border },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  bulletText: { ...typography.caption, color: palette.text, fontWeight: "700" },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.body, color: palette.text, fontWeight: "700" },
  optional: { ...typography.caption, color: palette.textMuted, textTransform: "uppercase", fontSize: 10 },
  error: { ...typography.body, color: palette.text, textAlign: "center", textTransform: "uppercase" },
});
