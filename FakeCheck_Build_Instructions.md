# FakeCheck — Build Instruction List for Cowork

**Goal of this document:** a single, sequenced, executable set of instructions a developer agent (Cowork) can follow top-to-bottom to ship a *working* FakeCheck app — backend deployed, mobile app running, end-to-end scan → identify → fake-check → verdict → correction working.

**Definition of done:** A tester installs the Expo dev build on a phone, points it at a sneaker/handbag/Pokémon card/watch, gets an identification, runs the guided fake check, sees a verdict with evidence, and can submit a correction that lands in the production database.

---

## 0. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Backend | **ASP.NET Core Web API on .NET 10 (LTS)** | Project standard; LTS to Nov 2028. (.NET 8 is the older LTS; .NET 10 GA'd Nov 2025.) |
| Front-end | **React Native via Expo SDK 56** (RN 0.85, React 19.2, New Architecture always on) | Project standard; SDK 56 is current as of May 2026. |
| Launch categories | **4: Sneakers, Luxury Handbags, Pokémon Cards, Luxury Watches** | Deeper prompt tuning per spec §17 Q4. Others are post-launch. |
| Vision model | **Tiered** — Gemini Flash for *identification* (cheap), premium vision model (GPT / Claude / Gemini Pro) for *authentication checks* | Controls per-scan cost; spec §17 Q1. |
| Object storage | **Cloudflare R2** (S3-compatible, zero egress fees) | Lean; cheapest at scale. Swappable for S3/GCS. |
| Deploy | **Railway** (backend Docker + managed Postgres + Redis); Render as fallback | Cheapest path to a running .NET API + managed DB. |
| Async heavy jobs | **Synchronous for MVP**, Redis + background queue wired but optional | Keep MVP simple; queue is one config flip away. |
| Auth (users) | **None at launch** (anonymous device ID) | Spec: no login to scan. Account system is V2. |

**Cost note (verify before launch):** Gemini Flash is the cheapest production multimodal endpoint (~$0.075 in / $0.30 out per 1M tokens). A phone photo ≈ 2.5k–6.6k image tokens depending on provider. Budget the premium model only for the 4–8 auth-check calls per scan, not identification.

---

## 1. Prerequisites & Tooling (Phase 0)

Run these once on the build machine. **Verify each with the check command before moving on.**

```bash
# .NET 10 SDK
# Install from https://dotnet.microsoft.com/download/dotnet/10.0 (or `winget install Microsoft.DotNet.SDK.10` / brew)
dotnet --version            # expect 10.x

# Node LTS (for Expo) + npm
node --version              # expect 20.x or 22.x LTS
npm --version

# Expo / EAS CLI
npm install -g eas-cli
npx create-expo-app --version

# Docker (for backend container + local Postgres)
docker --version
docker compose version

# Git + GitHub CLI
git --version
gh --version               # `gh auth login` if not authenticated

# Railway CLI
npm install -g @railway/cli
railway --version
```

**Accounts/keys to create now (store in a password manager, NOT in git):**
- GitHub org/repo
- Railway account (link GitHub)
- Cloudflare account → R2 bucket + API token
- Vision API keys: Google AI Studio (Gemini) + one premium provider (OpenAI or Anthropic)
- Apple Developer ($99/yr) + Google Play Console ($25 one-time) — needed only for store builds, not dev builds

✅ **Verification:** every `--version` command above prints a version.

---

## 2. Repository & Git Setup (Phase 1)

Single monorepo, two top-level apps.

```bash
mkdir fakecheck && cd fakecheck
git init -b main
```

Create this structure:

```
fakecheck/
├── backend/                 # ASP.NET Core solution
├── mobile/                  # Expo React Native app
├── docs/                    # this file + spec + prompt library
├── .github/workflows/       # CI
├── .gitignore
├── .editorconfig
└── README.md
```

`.gitignore` must cover: `bin/`, `obj/`, `node_modules/`, `.expo/`, `*.env`, `appsettings.*.Local.json`, `*.keystore`, `*.p8`, `.DS_Store`.

**Branching:** trunk-based. `main` is always deployable. Feature work on `feat/*` branches, squash-merge via PR.

**Commit convention:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

```bash
git add .
git commit -m "chore: scaffold monorepo structure"
gh repo create fakecheck --private --source=. --push
```

**CI (add now, expand later)** — `.github/workflows/ci.yml`:
- Job `backend`: `dotnet restore` → `dotnet build` → `dotnet test`.
- Job `mobile`: `npm ci` → `npm run lint` → `npm test`.
- Trigger on PR + push to `main`.

✅ **Verification:** push a no-op PR; CI runs and both jobs pass (green check).
🔵 **Commit/check-in gate:** `feat(ci): add build+test pipeline`.

---

## 3. Backend Scaffold (Phase 2)

Clean, layered solution. Run inside `backend/`.

```bash
cd backend
dotnet new sln -n FakeCheck
dotnet new webapi -n FakeCheck.Api          --use-controllers
dotnet new classlib -n FakeCheck.Core        # domain models, verdict logic, interfaces
dotnet new classlib -n FakeCheck.Infrastructure  # EF Core, R2, vision clients
dotnet new xunit -n FakeCheck.Tests
dotnet sln add **/*.csproj
# References
dotnet add FakeCheck.Api reference FakeCheck.Core FakeCheck.Infrastructure
dotnet add FakeCheck.Infrastructure reference FakeCheck.Core
dotnet add FakeCheck.Tests reference FakeCheck.Core FakeCheck.Infrastructure FakeCheck.Api
```

Add packages:

```bash
dotnet add FakeCheck.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add FakeCheck.Infrastructure package AWSSDK.S3            # R2 is S3-compatible
dotnet add FakeCheck.Api package Microsoft.EntityFrameworkCore.Design
dotnet add FakeCheck.Api package Swashbuckle.AspNetCore         # OpenAPI/Swagger
dotnet add FakeCheck.Api package Serilog.AspNetCore            # structured logging
dotnet add FakeCheck.Api package FluentValidation.AspNetCore
```

**Project layout inside Core:** `Models/` (Scan, Check, Verdict, Correction, Category, Product), `Authentication/` (verdict engine, weights, hard-fail rules), `Abstractions/` (`IVisionClient`, `IStorageClient`, `IScanRepository`).

**Kestrel for cloud:** in `Program.cs`, bind to `0.0.0.0` and read `PORT` env var (required for Railway):

```csharp
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
```

✅ **Verification:** `dotnet run --project FakeCheck.Api` → `GET /swagger` loads; default weather endpoint returns 200.
🔵 **Check-in:** `feat(api): scaffold layered .NET 10 solution`.

---

## 4. Database & Data Model (Phase 3)

Postgres via EF Core. Local Postgres with Docker Compose for development.

`backend/docker-compose.dev.yml`:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: fakecheck
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes: { pgdata: {} }
```

**Core tables (EF Core entities):**

- `categories` — id (slug, e.g. `sneaker`), display_name, active.
- `products` — id (slug, e.g. `lv_neverfull_mm`), category_id, brand, line, fake_bar (decimal; higher for high-counterfeit items per spec §7.2).
- `auth_steps` — id, category_id, ordinal, instruction_title, tip_text, reference_image_url, requirement (`required|optional|conditional`), condition_json, check_id, weight (1/2/3 per spec §7.1).
- `scans` — id (uuid), device_id, category_id, product_id, identified_at, status, created_at.
- `scan_photos` — id, scan_id, step_id (nullable for the ID photo), image_url, blur_score.
- `checks` — id, scan_id, check_id, score (0–100), result (`pass|fail|inconclusive`), observation, raw_model_json.
- `verdicts` — id, scan_id, verdict (`authentic|counterfeit|inconclusive`), overall_confidence, hard_fail_triggered, created_at.
- `corrections` — **exactly the schema in spec §9.3** (scan_id, user_correction, explanation, supporting_image_urls[], original_verdict, original_confidence, item_category, product_id, original_checks jsonb, all_scan_image_urls[], submitted_at, app_version, platform). Index on (item_category, product_id, user_correction) for AI-agent filtering per spec §8.2.
- `audit_logs` — id, scan_id, event, payload jsonb, created_at.

Use `jsonb` for `original_checks`, `condition_json`, `raw_model_json`.

```bash
dotnet ef migrations add InitialSchema --project FakeCheck.Infrastructure --startup-project FakeCheck.Api
dotnet ef database update --project FakeCheck.Infrastructure --startup-project FakeCheck.Api
```

**Seed data:** a `DbSeeder` that populates `categories`, `products`, and `auth_steps` for the 4 launch categories straight from spec §6.1, §6.2, §6.3, §6.4 (step order, required/optional flags, check weights). Reference images go in R2; store URLs in `auth_steps.reference_image_url`.

✅ **Verification:** `docker compose -f docker-compose.dev.yml up -d` → `dotnet ef database update` → connect with `psql` and confirm 4 categories + their steps are seeded.
🔵 **Check-in:** `feat(db): schema, migrations, seed for 4 launch categories`.

---

## 5. Object Storage (Phase 4)

Cloudflare R2 (S3-compatible) for scan photos + correction attachments + reference images.

- Create buckets: `fakecheck-scans` (lifecycle: delete after 30 days per spec §14), `fakecheck-corrections` (retain indefinitely, EXIF-stripped), `fakecheck-reference` (public read).
- Implement `IStorageClient` over `AWSSDK.S3` pointed at the R2 endpoint.
- **Upload flow:** mobile requests a presigned PUT URL from the API (`POST /uploads/presign`), uploads directly to R2, then sends the resulting object key to analysis endpoints. Keeps large image bytes off the API server.
- **EXIF stripping:** strip EXIF (esp. GPS) from any image moved to the corrections bucket (spec §14). Use ImageSharp or a server-side re-encode.

✅ **Verification:** integration test uploads a test JPEG via presigned URL, reads it back, confirms a copied-to-corrections version has no GPS EXIF.
🔵 **Check-in:** `feat(storage): R2 presigned uploads + EXIF stripping`.

---

## 6. Vision Integration & Prompt Library (Phase 5)

This is the **core IP** (spec §17 Q2). Two tiers behind `IVisionClient`.

**Tier 1 — Identification** (`POST` to Gemini Flash): one photo in → `{ category, brand, product_line, confidence, alternatives[] }`. Cheap, fast.

**Tier 2 — Authentication checks** (premium vision model): one call per auth step, each with a *step-specific system prompt* that returns strict JSON `{ score: 0-100, result, observations, red_flags[] }` (see spec §10.1 example for Pokémon edge check).

**Prompt library** — create `docs/prompts/` with one file per category/check, version-controlled:

```
docs/prompts/
├── identify.system.md
├── sneaker/{box_label,silhouette,toe_box,heel,sole,tongue}.md
├── handbag/{exterior,stitching,hardware,date_code,lining}.md
├── pokemon/{front,back,edge,holo}.md
└── watch/{dial,case,caseback,bracelet}.md
```

Each prompt encodes: what to look for, what authentic looks like, common fake indicators, and the scoring instruction (spec §10.1). Pull red-flag content directly from spec §6.1–§6.4 ("Key red flags").

**Resilience:** strict JSON parsing with a repair retry; timeout + fallback to `inconclusive` for that check on model error; log `raw_model_json` to the `checks` table for later fine-tuning (spec §10.3).

**Cost guardrail:** downscale images to the model's optimal tile size before sending (Gemini ≤768px tiles); cap auth calls per scan.

✅ **Verification:** unit tests with recorded fixture images: a known-authentic sneaker scores high, a known-fake scores low; malformed model output is repaired or downgraded to inconclusive, never crashes.
🔵 **Check-in:** `feat(vision): tiered ID+auth clients and prompt library`.

---

## 7. Verdict Engine (Phase 6)

Pure logic in `FakeCheck.Core` (no I/O → fully unit-testable). Implement spec §7 exactly:

- **Weighted average:** `Σ(score × weight) / Σ(weight)` over completed checks.
- **Thresholds:** ≥80 Authentic · 50–79 Inconclusive · <50 Counterfeit (spec §7.2).
- **Per-product fake bar:** raise the Authentic threshold for high-counterfeit products (Yeezy, LV) via `products.fake_bar` (spec §7.2).
- **Hard fails (spec §7.3):** if a critical check fails definitively (LV date-code format wrong, Pokémon missing black core, VIN mismatch, watch serial format wrong), override → immediate Counterfeit, set `hard_fail_triggered`.
- **Required-step gate:** cannot produce a verdict until all `required` steps have photos (spec edge cases §13).
- **Inconclusive output:** include which checks were uncertain + suggested in-person verification services per category (spec §7.4).

✅ **Verification:** xUnit table-driven tests covering each threshold boundary, a hard-fail override, a missing-required-step rejection, and the per-product elevated bar. **Verify the math programmatically** (this is the verification gate for this phase).
🔵 **Check-in:** `feat(core): verdict engine with weights, thresholds, hard-fails + tests`.

---

## 8. API Endpoints (Phase 7)

Controllers in `FakeCheck.Api`. All requests carry an anonymous `X-Device-Id` header.

| Method/Route | Purpose | Body / Returns |
|---|---|---|
| `POST /uploads/presign` | Get presigned R2 PUT URL | `{count}` → `[{key, url}]` |
| `POST /identify` | Tier-1 identification | `{image_key}` → `{category, product, confidence, alternatives[]}` |
| `GET /categories/{id}/steps` | Auth flow for a category | → ordered `auth_steps` (for the guided UI) |
| `POST /scans` | Create a scan record | `{device_id, category, product}` → `{scan_id}` |
| `POST /auth/analyze` | Tier-2 multi-photo analysis + verdict | spec §9.2 body → `{verdict, overall_confidence, checks[]}` |
| `POST /corrections` | Ingest a dispute | spec §9.3 schema → `{ok:true}` |
| `GET /health` | Liveness/readiness | → 200 |

Cross-cutting: FluentValidation on every body; Serilog request logging; global exception handler returning RFC-7807 problem details; rate-limit by device id. Add the legal disclaimer string ("AI-assisted assessment, not a certified appraisal", spec §17 Q3) to every verdict response.

✅ **Verification:** Swagger UI exercises the full happy path with fixture image keys; an integration test runs `identify → scans → analyze → corrections` against the dockerized Postgres and asserts a correction row lands with the spec §9.3 shape.
🔵 **Check-in:** `feat(api): identify, analyze, corrections, presign endpoints`.

---

## 9. Backend Deploy to Railway (Phase 8)

Get the server *running in production* before building much UI, so the mobile app targets a real URL.

`backend/Dockerfile` (multi-stage, .NET 10):

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish FakeCheck.Api -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "FakeCheck.Api.dll"]
```

Railway steps:

```bash
railway login
railway init                       # create project
railway add --database postgres    # managed Postgres (auto backups, pooling)
railway add --database redis        # optional, for queue
railway up                          # build Dockerfile + deploy
```

- Railway auto-detects the Dockerfile (Railpack doesn't support .NET — Dockerfile is required).
- Set env vars in Railway: `ConnectionStrings__Default` (from Railway's `DATABASE_URL`, convert to Npgsql format), `R2__*` keys, `Vision__Gemini__ApiKey`, `Vision__Premium__ApiKey`. **Never commit these.**
- Confirm Kestrel binds `0.0.0.0:$PORT` (Phase 3) — Railway injects `PORT`.
- Run `dotnet ef database update` against the Railway DB (one-off `railway run` or a release-phase migration step).
- Set `/health` as the Railway healthcheck path.

✅ **Verification:** `curl https://<railway-domain>/health` → 200, and `/swagger` loads publicly. Capture the production base URL for the mobile `.env`.
🔵 **Check-in:** `feat(deploy): Dockerfile + Railway config; backend live`.

> Fallback: if Railway uptime is a concern (known 2026 outage pattern), the identical Dockerfile + managed Postgres deploys to **Render** with predictable monthly pricing.

---

## 10. Mobile App Scaffold (Phase 9)

Run inside `mobile/`.

```bash
cd ../  # repo root
npx create-expo-app@latest mobile
cd mobile
# Core deps
npx expo install expo-camera expo-image-picker expo-image-manipulator expo-sqlite expo-file-system expo-network expo-secure-store
npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
npx expo install react-native-reanimated
npm install zustand @tanstack/react-query axios
npm install react-native-paper react-native-vector-icons
npm install --save-dev jest jest-expo @testing-library/react-native eslint
```

(Spec §11 allows `react-native-vision-camera` as an alternative to `expo-camera`; start with `expo-camera` for managed-workflow simplicity.)

**Config:**
- `app.json`: name FakeCheck, camera permission strings (iOS `NSCameraUsageDescription`, Android `CAMERA`), New Architecture is on by default (SDK 56).
- `.env` (gitignored) + `app.config.ts` to inject `EXPO_PUBLIC_API_URL` = the Railway URL from Phase 9.
- Folder structure: `src/screens/`, `src/components/`, `src/api/` (axios + React Query hooks), `src/store/` (Zustand), `src/db/` (expo-sqlite), `src/theme/`.

✅ **Verification:** `npx expo start`, open in Expo Go / dev build, blank app boots on a device; `EXPO_PUBLIC_API_URL` resolves and `GET /health` succeeds from the app.
🔵 **Check-in:** `feat(mobile): Expo SDK 56 scaffold + navigation + API client`.

---

## 11. Mobile Screens (Phase 10)

Build screens in flow order (spec §3, §4). One commit per screen group.

1. **Home / Camera (§4.1):** full-screen `expo-camera` viewfinder, framing overlay, capture button, gallery import, flash toggle, history icon. Camera opens on launch; no login. *(Commit: `feat(mobile): home camera screen`)*
2. **Identification Result (§4.2):** show photo, item name, category tag, color-coded confidence ring (green ≥80 / yellow 50–79 / red <50), confidence label, "Not what you have?" manual category picker, **Check if Fake** CTA, Save/Scan-again. If confidence <40, nudge retake. Calls `POST /identify`. *(Commit: `feat(mobile): identification result`)*
3. **Authentication Intro (§4.3):** confirmed item, "N more photos, ~60–90s", preview list of what's photographed (from `GET /categories/{id}/steps`), Start / Not now. *(Commit)*
4. **Guided Photo Steps (§4.4):** per-step counter + progress bar, instruction title, reference image, tip text, viewfinder, capture, skip (optional only), pinch zoom. Handle required/optional/conditional logic. Upload each photo via presigned URL. *(Commit)*
5. **Processing (§4.5):** scanning animation (Reanimated), "Analyzing [item]…", rotating check tips every 2s. Calls `POST /auth/analyze`. *(Commit)*
6. **Verdict (§4.6):** large color+icon+text verdict badge, overall confidence, expandable evidence list (check name, ✓/✗/?, finding, tap → photo + observation), always-visible "What to look for", **Dispute** (secondary), Done / Scan another. Show the legal disclaimer. *(Commit)*
7. **Correction / Dispute (§4.7):** "Tell us what we got wrong", original verdict, Authentic/Fake/Unsure toggle, required 20–500 char reason, up to 3 supporting photos, submit → optimistic confirm, tag scan "Disputed", queue for sync. Calls `POST /corrections`. *(Commit)*
8. **Scan History (§4.8):** chronological list from local SQLite (thumbnail, name, verdict badge, date, category), filter All/Authentic/Counterfeit/Inconclusive/Disputed, search, tap → read-only verdict, swipe delete. *(Commit)*
9. **Settings (§4.9):** camera quality toggle, clear history, privacy/terms links, app version, send feedback, disabled Create Account/Sign In placeholders. *(Commit)*

**Cross-cutting UX (spec §12):** no splash/onboarding wall (scanning within ~2s), reference images on every step, confidence always shown with evidence, dispute button easy to find, WCAG AA contrast with text always paired alongside color.

✅ **Verification per screen:** load it in the running app on a device and confirm the documented behavior; for §4.6/§4.7 confirm a real `analyze` + `correction` round-trips to Railway.

---

## 12. Local Storage, Offline & Image Pipeline (Phase 11)

- **expo-sqlite** schema mirroring scans/verdicts/checks for offline history (spec §4.8 storage). Write on every completed verdict.
- **Offline resilience (spec §12.5):** queue corrections locally when offline (expo-network detects connectivity), flush on reconnect; mark scan "Disputed" optimistically.
- **Image pipeline:** `expo-image-manipulator` to downscale/compress before upload (camera-quality setting from Settings), compute a **blur score** client-side and prompt retake if too blurry (spec §13). Flag screenshots/missing-EXIF (spec §13).

✅ **Verification:** airplane-mode test — complete a scan offline, history persists, submit a correction offline, re-enable network, confirm the queued correction reaches Railway.
🔵 **Check-in:** `feat(mobile): sqlite history + offline correction queue + blur detection`.

---

## 13. Learning Loop Wiring (Phase 12)

Minimum viable version of spec §8 / §10.3 so corrections become training data from day one.

- Corrections already land in Postgres with the §9.3 schema (Phase 4/8).
- Add a **nightly export job** (a small `dotnet` console task or Railway cron) that selects confirmed corrections and writes a labeled JSONL dataset to the corrections R2 bucket (spec §10.3 first stages). Fine-tuning/A-B is V2 — just make the data exportable and queryable.
- Ensure `checks.raw_model_json` is retained so original AI analysis can be compared against user ground truth (spec §8.2).

✅ **Verification:** run the export job against seeded/sample corrections; confirm a JSONL file appears in R2 with category/product/verdict/ground-truth fields.
🔵 **Check-in:** `feat(ml): nightly corrections export to labeled dataset`.

---

## 14. Testing & Hardening (Phase 13)

- **Backend:** xUnit unit tests (verdict engine — already), integration tests (endpoints against dockerized Postgres), vision-client tests with fixtures. Target meaningful coverage on Core.
- **Mobile:** Jest + React Native Testing Library for screen logic and the API hooks; mock the API.
- **E2E smoke:** a scripted run of identify → analyze → correction against the **staging** Railway deploy.
- **Edge cases (spec §13):** explicit tests/handling for blur, unrecognized item, network error + retry, too many skipped required steps, all-low-confidence → inconclusive, screenshot detection.
- **Security review:** run the `security-review` pass on the backend before exposing publicly (secrets handling, presigned-URL scope, rate limits, input validation, EXIF stripping).

✅ **Verification:** CI green on both jobs; E2E smoke passes against staging; security review has no high-severity findings.
🔵 **Check-in:** `test: integration + e2e + edge-case coverage`.

---

## 15. App Builds & Store Prep (Phase 14)

- Configure **EAS Build** (`eas.json`): `development`, `preview`, `production` profiles.
- `eas build --profile development` → install dev build on a physical device for real-camera testing (Expo Go can't fully test camera/new-arch native modules).
- `eas build --profile production` for iOS + Android once flows pass.
- Store metadata: app name (run the FakeCheck trademark check per spec §17 Q5 first), icon, screenshots, **privacy policy + terms** (spec §14: photos used only for auth; 30-day deletion; correction photos EXIF-stripped; no PII required), and the AI-assist disclaimer.
- `eas submit` to TestFlight / Play internal testing.

✅ **Verification:** a tester installs from TestFlight/Play internal track and completes a full real-world scan on each of the 4 categories.
🔵 **Check-in:** `chore(release): EAS profiles + store metadata`.

---

## 16. Metrics & Post-Launch (Phase 15)

- Wire analytics (PostHog or Mixpanel, spec §11/§15) for: identification accuracy proxy, fake-check conversion, step completion/skip, correction rate + direction, category distribution, time-to-verdict, retry rate.
- Dashboard these (§15) to drive iteration and prioritize prompt tuning + the V2 fine-tune.

✅ **Verification:** events appear in the analytics dashboard from a test session.
🔵 **Check-in:** `feat(analytics): product metrics instrumentation`.

---

## 17. Final Acceptance Checklist (Definition of Done)

Tick all before declaring the app working:

- [ ] CI green; `main` deploys cleanly.
- [ ] Backend live on Railway; `/health` 200; `/swagger` loads.
- [ ] Postgres migrated + seeded with 4 categories and their auth steps.
- [ ] R2 buckets exist; presigned upload + EXIF stripping verified.
- [ ] Identify → analyze → verdict works end-to-end against production for all 4 categories.
- [ ] Verdict engine math verified by tests (thresholds, hard-fails, per-product bar, required-step gate).
- [ ] Correction submits and lands in Postgres with the §9.3 schema; offline queue flushes.
- [ ] Scan history persists locally and survives offline.
- [ ] Legal disclaimer shown on every verdict; privacy policy + terms published.
- [ ] Dev build installs on a real device and completes a real scan per category.
- [ ] Security review: no high-severity findings.
- [ ] Nightly corrections export produces a labeled dataset.

---

## Appendix A — Phase → Spec Traceability

| Phase | Spec sections |
|---|---|
| 3–4 Backend/DB | §9, §9.3 |
| 5 Storage | §14 |
| 6 Vision/Prompts | §5, §10.1, §6.1–§6.4 |
| 7 Verdict engine | §7 |
| 8 API | §9.1, §9.2 |
| 10–11 Mobile | §3, §4, §11, §12 |
| 12 Offline/storage | §4.8, §12, §13 |
| 13 Learning loop | §8, §10.3 |
| 15 Builds | §14, §17 Q5 |
| 16 Metrics | §15 |

## Appendix B — Open Questions to Resolve During Build (from spec §17)

1. Confirm final vision-model providers + per-scan cost ceiling once real images are tested.
2. The per-check prompt library is the core IP — budget real time to write and test each before launch.
3. Keep the "AI-assisted, not a certified appraisal" disclaimer everywhere; do not market as legal authentication.
4. Launch with the 4 chosen categories; expand only after prompt accuracy is validated.
5. Trademark-clear the "FakeCheck" name before store submission.
