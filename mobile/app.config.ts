import { ExpoConfig, ConfigContext } from "expo/config";

// Merges app.json with runtime/env-driven values.
// EXPO_PUBLIC_API_URL is read at build/start time from .env (see secrets/mobile.env).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "FakeCheck",
  slug: config.slug ?? "fakecheck",
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080",
  },
});
