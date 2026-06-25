import axios from "axios";
import Constants from "expo-constants";
import { getDeviceId } from "./deviceId";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "https://fakecheck-production.up.railway.app";

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
});

// Attach the anonymous device id the backend uses for rate-limiting (X-Device-Id).
api.interceptors.request.use(async (config) => {
  const deviceId = await getDeviceId();
  config.headers.set?.("X-Device-Id", deviceId);
  return config;
});

export const API_BASE_URL = apiUrl;
