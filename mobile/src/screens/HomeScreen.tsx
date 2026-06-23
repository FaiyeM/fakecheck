import React from "react";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { palette } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

// Phase 10: full-screen camera viewfinder + framing overlay + capture (spec §4.1).
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <Screen title="FakeCheck">
      <Text style={{ color: palette.textMuted }}>
        Camera viewfinder (Phase 10). Point at a sneaker, handbag, Pokémon card, or watch.
      </Text>
      <Button title="Identify (stub)" onPress={() => navigation.navigate("IdentificationResult")} />
      <Button title="History" onPress={() => navigation.navigate("History")} />
      <Button title="Settings" onPress={() => navigation.navigate("Settings")} />
    </Screen>
  );
}
