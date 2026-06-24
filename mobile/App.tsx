import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/api/queryClient";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useCorrectionSync } from "./src/api/correctionSync";
import { analytics, initAnalytics } from "./src/analytics";
import { getDeviceId } from "./src/api/deviceId";
import { palette } from "./src/theme";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bg,
    card: palette.surface,
    text: palette.text,
    primary: palette.primary,
  },
};

export default function App() {
  // Drain any offline-queued corrections on launch + reconnect (spec §12.5).
  useCorrectionSync();

  // Start analytics once, tie events to the anonymous device id (spec §15).
  useEffect(() => {
    (async () => {
      await initAnalytics();
      analytics.identify(await getDeviceId());
      analytics.appOpened();
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
