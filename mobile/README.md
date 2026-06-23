# FakeCheck Mobile (Expo SDK 56)

React Native app for identifying items and running guided authenticity checks
(sneakers, luxury handbags, Pokémon cards, luxury watches).

## Status

Phase 9 scaffold: project config, navigation, theme, typed API client (React Query
+ axios), Zustand scan store, and expo-sqlite schema are in place. Screens are
stubs wired into the navigator; full screen UIs land in Phase 10.

## Setup

The build sandbox can't reach the npm registry, so dependency versions in
`package.json` are best-effort and **must be reconciled in a networked env**:

```bash
cd mobile
npm install                 # generates package-lock.json (commit it — enables mobile CI)
npx expo install --fix      # pins native modules to the exact SDK 56 versions
```

Set the API URL (the backend health/identify/analyze base) before starting:

```bash
# secrets/mobile.env -> copied/exported as EXPO_PUBLIC_API_URL
export EXPO_PUBLIC_API_URL="https://<your-railway-app>.up.railway.app"
npx expo start
```

`app.config.ts` reads `EXPO_PUBLIC_API_URL` into `expoConfig.extra.apiUrl`, which
`src/api/client.ts` uses as the axios base URL. Every request sends an anonymous
`X-Device-Id` (persisted in expo-secure-store) for backend rate-limiting.

## Layout

- `src/api/` — axios client, typed endpoint wrappers, React Query hooks (mirror `backend/.../Dtos.cs`)
- `src/store/` — Zustand state for the active scan flow
- `src/db/` — expo-sqlite schema (offline history + correction outbox)
- `src/navigation/` — native-stack navigator + route param types
- `src/screens/` — one screen per spec §4 step (stubs until Phase 10)
- `src/theme/` — color/spacing/typography tokens (WCAG AA, confidence/verdict colors)

## Verification (Phase 9 done criteria)

Run on a device/simulator in a networked env: `npx expo start` boots a blank app,
navigation works across all routes, and `EXPO_PUBLIC_API_URL` resolves so
`GET /health` succeeds. Not runnable in the build sandbox (no npm network).
