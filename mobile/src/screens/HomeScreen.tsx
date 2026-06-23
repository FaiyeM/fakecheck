import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraCapture } from "../components/CameraCapture";
import { useScanStore } from "../store/scanStore";
import { spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

// Camera opens on launch, no login (spec §4.1). Capture -> identify flow.
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const reset = useScanStore((s) => s.reset);
  const setPrimaryPhoto = useScanStore((s) => s.setPrimaryPhoto);

  const handleCapture = (uri: string) => {
    reset();
    setPrimaryPhoto(uri);
    navigation.navigate("IdentificationResult");
  };

  return (
    <View style={styles.root}>
      <CameraCapture
        onCapture={handleCapture}
        overlay={
          <SafeAreaView style={styles.hintWrap} pointerEvents="box-none">
            <Text style={styles.hint}>
              Point at a sneaker, handbag, Pokémon card, or watch
            </Text>
          </SafeAreaView>
        }
      />

      <SafeAreaView style={styles.topRight} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan history"
          onPress={() => navigation.navigate("History")}
          style={styles.iconBtn}
        >
          <Text style={styles.iconText}>History</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => navigation.navigate("Settings")}
          style={styles.iconBtn}
        >
          <Text style={styles.iconText}>Settings</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  hintWrap: { alignItems: "center" },
  hint: {
    ...typography.body,
    color: "#fff",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  topRight: {
    position: "absolute",
    top: 0,
    left: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  iconText: { ...typography.caption, color: "#fff", fontWeight: "600" },
});
