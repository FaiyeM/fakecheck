import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { deleteScan, listScans, type ScanRow } from "../db";
import { categoryLabel } from "../constants/categories";
import { palette, spacing, typography, verdictColor, type VerdictKey } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "History">;

type Filter = "All" | "Authentic" | "Counterfeit" | "Inconclusive" | "Disputed";
const FILTERS: Filter[] = ["All", "Authentic", "Counterfeit", "Inconclusive", "Disputed"];

function keyOf(v: string | null): VerdictKey {
  const k = (v ?? "").toLowerCase().replace(/\s+/g, "_");
  if (k in verdictColor) return k as VerdictKey;
  if (k.includes("counter") || k === "fake") return "counterfeit";
  if (k.includes("authentic")) return "authentic";
  return "inconclusive";
}

function matchesFilter(row: ScanRow, f: Filter): boolean {
  if (f === "All") return true;
  if (f === "Disputed") return row.disputed === 1;
  const key = keyOf(row.verdict);
  if (f === "Authentic") return key === "authentic" || key === "likely_authentic";
  if (f === "Counterfeit") return key === "counterfeit" || key === "likely_counterfeit";
  return key === "inconclusive";
}

// Chronological SQLite list + filter + search + tap-to-view + delete (spec §4.8).
export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    listScans()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        matchesFilter(r, filter) &&
        (q === "" ||
          (r.display_name ?? "").toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q))
    );
  }, [rows, filter, query]);

  const confirmDelete = (row: ScanRow) => {
    Alert.alert("Delete scan?", "This removes it from your history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteScan(row.id).then(load),
      },
    ]);
  };

  return (
    <Screen title="HISTORY">
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="SEARCH BY ITEM OR CATEGORY"
        placeholderTextColor={palette.textMuted}
      />

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filter, filter === f && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No scans yet. Scan an item to start.</Text>}
        renderItem={({ item }) => {
          const color = verdictColor[keyOf(item.verdict)];
          return (
            <Pressable
              onPress={() => navigation.navigate("Verdict", { scanId: item.id })}
              onLongPress={() => confirmDelete(item)}
              style={styles.row}
            >
              {item.thumbnail_uri ? (
                <Image source={{ uri: item.thumbnail_uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {(item.display_name ?? categoryLabel(item.category)).toUpperCase()}
                </Text>
                <Text style={styles.meta}>
                  {categoryLabel(item.category).toUpperCase()} · {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.badges}>
                {item.disputed === 1 && <Text style={styles.disputedBadge}>DISPUTED</Text>}
                <Text style={[styles.verdict, { color }]}>{String(item.verdict ?? "—").toUpperCase()}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <Text style={styles.hint}>Long-press a scan to delete it.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
    padding: spacing.sm,
    color: palette.text,
    backgroundColor: palette.surface,
    marginBottom: spacing.sm,
    ...typography.body,
  },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  filter: {
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "transparent",
  },
  filterActive: { borderColor: palette.border, backgroundColor: palette.primary },
  filterText: { ...typography.caption, color: palette.text, textTransform: "uppercase", letterSpacing: 0.5 },
  filterTextActive: { color: palette.onPrimary, fontWeight: "700" },
  list: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  thumb: { width: 52, height: 52, borderWidth: 1.5, borderColor: palette.border, borderRadius: 0, marginRight: spacing.md },
  thumbEmpty: { backgroundColor: palette.surfaceAlt },
  rowBody: { flex: 1 },
  name: { ...typography.body, color: palette.text, fontWeight: "700" },
  meta: { ...typography.caption, color: palette.textMuted, marginTop: 2 },
  badges: { alignItems: "flex-end" },
  disputedBadge: { ...typography.caption, color: palette.textMuted, marginBottom: 2, textTransform: "uppercase" },
  verdict: { ...typography.caption, fontWeight: "700" },
  empty: { ...typography.body, color: palette.textMuted, textAlign: "center", marginTop: spacing.xl, textTransform: "uppercase" },
  hint: { ...typography.caption, color: palette.textMuted, textAlign: "center", marginTop: spacing.sm, textTransform: "uppercase" },
});
