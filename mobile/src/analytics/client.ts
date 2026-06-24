import Constants from "expo-constants";

// Thin PostHog wrapper. The SDK is loaded lazily so (a) the rest of the app
// compiles and runs even before `posthog-react-native` is installed, and
// (b) analytics is fully optional: with no key configured, every call is a
// no-op and nothing here can ever throw into the UI.

type CaptureProps = Record<string, unknown>;

interface PostHogLike {
  capture(event: string, properties?: CaptureProps): void;
  identify(distinctId: string, properties?: CaptureProps): void;
  flush?(): Promise<void> | void;
}

type PostHogCtor = new (apiKey: string, options: { host: string }) => PostHogLike;

let client: PostHogLike | null = null;
let initialized = false;

function readConfig(): { key: string; host: string } {
  const extra = Constants.expoConfig?.extra as
    | { posthogKey?: string; posthogHost?: string }
    | undefined;
  return {
    key: extra?.posthogKey ?? process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "",
    host:
      extra?.posthogHost ??
      process.env.EXPO_PUBLIC_POSTHOG_HOST ??
      "https://us.i.posthog.com",
  };
}

export function analyticsEnabled(): boolean {
  return readConfig().key.length > 0;
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const { key, host } = readConfig();
  if (!key) return; // disabled: no key configured

  try {
    // Non-literal specifier: TypeScript treats this as `any` and does not try
    // to resolve the module at build time, so the project compiles before the
    // package is installed. At runtime it loads the real SDK once present.
    const spec: string = "posthog-react-native";
    const mod: { default?: PostHogCtor; PostHog?: PostHogCtor } = await import(spec);
    const Ctor = mod.default ?? mod.PostHog;
    if (Ctor) client = new Ctor(key, { host });
  } catch {
    client = null; // SDK missing or failed to init -> stay a no-op
  }
}

export function capture(event: string, props?: CaptureProps): void {
  try {
    client?.capture(event, props);
  } catch {
    // analytics must never surface errors to the user
  }
}

export function identify(distinctId: string, props?: CaptureProps): void {
  try {
    client?.identify(distinctId, props);
  } catch {
    // noop
  }
}

/** Test seam: inject a fake client (or null) without going through init. */
export function __setClientForTests(fake: PostHogLike | null): void {
  client = fake;
  initialized = true;
}
