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

      <SafeAreaView style={styles.headerBar} pointerEvents="box-none">
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>SNAP CHECK</Text>
          <Text style={styles.subTitle}>powered by flossin</Text>
        </View>
        <View style={styles.navButtons}>
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
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  hintWrap: { alignItems: "center" },
  hint: {
    ...typography.caption,
    color: "#fff",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 0,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  branding: {
    flexDirection: "column",
  },
  brandTitle: {
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  subTitle: {
    fontFamily: "monospace",
    fontSize: 9,
    color: "#B0B0B0",
    marginTop: 1,
  },
  navButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 0,
  },
  iconText: {
    ...typography.caption,
    color: "#fff",
    fontWeight: "700",
    fontFamily: "monospace",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
