import React from "react";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "GuidedSteps">;

// Phase 10: per-step viewfinder + reference image + tip + progress (spec §4.4).
export function GuidedStepsScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <Screen title="Guided photos">
      <Text style={{ color: palette.textMuted }}>Step-by-step capture (Phase 10).</Text>
      <Button title="Analyze" onPress={() => navigation.navigate("Processing")} />
    </Screen>
  );
}
