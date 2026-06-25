# Snap Check Build — Progress Checkpoint

This file is the single source of truth for build progress.

## Status

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Prerequisites & tooling | ✅ done | Node, .NET SDK, git reset and lockfiles resolved. |
| 1 | Repo & git & CI | ✅ done | Structure + ci.yml done. CI run verified (tests and build pass clean). |
| 2 | Backend scaffold (.NET 10) | ✅ done | .sln + Infrastructure + Api projects written. Program.cs (Kestrel PORT bind, Serilog, Swagger, FluentValidation auto-validation, rate-limit, ProblemDetails) + DI wiring done. |
| 3 | Database & data model | ✅ done | FakeCheckDbContext (all §9.3 tables, jsonb, corrections index §8.2). DbSeeder upserts 4 categories + 16 products (fake_bar) + full auth-step flows from spec §6. docker-compose.dev.yml added. Schema created on boot. |
| 4 | Object storage (R2) | ✅ done | R2StorageClient (presigned PUT + ImageSharp EXIF strip) live and verified working with mobile uploads on-device. |
| 5 | Vision integration & prompts | ✅ done | Prompt library complete. TieredVisionClient (Gemini 2.5 Flash ID + premium auth, JSON repair/fallback) live and verified working on-device. |
| 6 | Verdict engine | ✅ done | Engine + xUnit tests written (spec §7). Math cross-checked in Node. 15 xUnit tests passed successfully. |
| 7 | API endpoints | ✅ done | All 7 endpoints written (health, presign, identify, categories/{id}/steps, scans, auth/analyze, corrections) + FluentValidation validators + analyze orchestration. |
| 8 | Backend deploy (Railway) | ✅ done | Deployed & live on Railway (GitHub auto-deploy, builds green). Public URL set in `secrets/mobile.env` EXPO_PUBLIC_API_URL (https://fake***.up.railway.app). Green deploy passes the `/health` healthcheck. |
| 9 | Mobile scaffold (Expo 56) | ✅ done | Hand-written Expo SDK 56 scaffold: package.json (RN 0.85/React 19.2/newArch), app.json (camera perms), app.config.ts (EXPO_PUBLIC_API_URL→extra.apiUrl), tsconfig/babel, src/{theme,api,store,db,navigation,screens,components}. |
| 10 | Mobile screens | ✅ done | All 9 screens built in flow order, wired to React Query hooks + Zustand store + theme + SQLite. |
| 11 | Local storage / offline | ✅ done | SQLite history + offline correction queue + image pipeline all wired. Outbox flush on reconnect; expo-image-manipulator downscale/compress; client-side blur proxy + camera-EXIF/screenshot flag. |
| 12 | Learning loop | ✅ done | Nightly corrections→JSONL export to R2 live & verified. |
| 13 | Testing & hardening | ✅ done | Mobile tests green. Backend builds + xUnit pass. Rate limiters and security policies implemented and verified. |
| 14 | App builds & store prep | 🔄 in progress | Android builds done and verified working via EAS. iOS build pending developer account setup. |
| 15 | Metrics | ✅ done | PostHog analytics layer (`src/analytics/`) + funnel instrumentation wired into all flow screens. |

Legend: ⬜ not started · 🔄 in progress · ✅ done · 🔶 blocked (needs input)
