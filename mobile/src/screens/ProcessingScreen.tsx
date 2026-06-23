import React from "react";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Processing">;

// Phase 10: scanning animation + rotating tips while POST /auth/analyze runs (spec §4.5).
export function ProcessingScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <Screen title="Analyzing…">
      <Text style={{ color: palette.textMuted }}>Running checks (Phase 10).</Text>
      <Button title="See verdict" onPress={() => navigation.navigate("Verdict")} />
    </Screen>
  );
}
