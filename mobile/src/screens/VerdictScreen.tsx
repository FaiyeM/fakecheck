import React from "react";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Verdict">;

// Phase 10: verdict badge + confidence + evidence list + disclaimer + Dispute (spec §4.6).
export function VerdictScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <Screen title="Verdict">
      <Text style={{ color: palette.textMuted }}>Verdict + evidence (Phase 10).</Text>
      <Button title="Dispute" onPress={() => navigation.navigate("Correction")} />
      <Button title="Scan another" onPress={() => navigation.navigate("Home")} />
    </Screen>
  );
}
