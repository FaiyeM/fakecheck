import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { palette } from "../theme";
import { HomeScreen } from "../screens/HomeScreen";
import { IdentificationResultScreen } from "../screens/IdentificationResultScreen";
import { AuthIntroScreen } from "../screens/AuthIntroScreen";
import { GuidedStepsScreen } from "../screens/GuidedStepsScreen";
import { ProcessingScreen } from "../screens/ProcessingScreen";
import { VerdictScreen } from "../screens/VerdictScreen";
import { CorrectionScreen } from "../screens/CorrectionScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="IdentificationResult" component={IdentificationResultScreen} options={{ title: "Identification" }} />
      <Stack.Screen name="AuthIntro" component={AuthIntroScreen} options={{ title: "Check authenticity" }} />
      <Stack.Screen name="GuidedSteps" component={GuidedStepsScreen} options={{ title: "Photos" }} />
      <Stack.Screen name="Processing" component={ProcessingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Verdict" component={VerdictScreen} options={{ title: "Verdict" }} />
      <Stack.Screen name="Correction" component={CorrectionScreen} options={{ title: "Dispute" }} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ title: "History" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}
