import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

// User settings (spec §4.9). Camera quality feeds the Phase 11 image pipeline.
export type CameraQuality = "standard" | "high";
const KEY = "fakecheck.settings.cameraQuality";

interface SettingsState {
  cameraQuality: CameraQuality;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setCameraQuality: (q: CameraQuality) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  cameraQuality: "high",
  hydrated: false,
  hydrate: async () => {
    const v = await SecureStore.getItemAsync(KEY);
    set({ cameraQuality: v === "standard" ? "standard" : "high", hydrated: true });
  },
  setCameraQuality: (q) => {
    set({ cameraQuality: q });
    SecureStore.setItemAsync(KEY, q).catch(() => undefined);
  },
}));
