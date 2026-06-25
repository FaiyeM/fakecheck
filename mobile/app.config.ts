import { ExpoConfig, ConfigContext } from "expo/config";

// Merges app.json with runtime/env-driven values.
// EXPO_PUBLIC_API_URL is read at build/start time from .env (see secrets/mobile.env).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Snap Check",
  slug: config.slug ?? "fakecheck",
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://fakecheck-production.up.railway.app",
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  },
});
