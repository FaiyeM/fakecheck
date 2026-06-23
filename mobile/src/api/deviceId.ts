import * as SecureStore from "expo-secure-store";

const KEY = "fakecheck.deviceId";

function uuid(): string {
  // RFC4122 v4-ish; sufficient as an anonymous device identifier.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

/** Anonymous, persistent device id used for rate-limiting and scan ownership (no login). */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await SecureStore.getItemAsync(KEY);
  if (!id) {
    id = uuid();
    await SecureStore.setItemAsync(KEY, id);
  }
  cached = id;
  return id;
}
