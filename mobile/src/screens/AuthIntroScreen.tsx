import React from "react";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "AuthIntro">;

// Phase 10: "N more photos, ~60-90s" + preview of steps (spec §4.3).
export function AuthIntroScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <Screen title="Authentication check">
      <Text style={{ color: palette.textMuted }}>What we will photograph (Phase 10).</Text>
      <Button title="Start" onPress={() => navigation.navigate("GuidedSteps")} />
    </Screen>
  );
}
