import React from "react";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "IdentificationResult">;

// Phase 10: photo + name + category tag + confidence ring + "Check if Fake" CTA (spec §4.2).
export function IdentificationResultScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <Screen title="Identification">
      <Text style={{ color: palette.textMuted }}>Identification result (Phase 10).</Text>
      <Button title="Check if Fake" onPress={() => navigation.navigate("AuthIntro")} />
    </Screen>
  );
}
