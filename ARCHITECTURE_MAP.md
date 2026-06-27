# Snap Check (FakeCheck) — Architecture & Feature Map

_Last generated: 28 June 2026 · Status: in testing (live on Google Play)_

This document is the living map of what the app is made of: every module, what it does,
how the pieces talk to each other, and where the data lives. It is meant to be the reference
you (and any agent) consult before touching anything. It describes the code **as built**, not
the original spec.

---

## 1. What the product does (one paragraph)

Point your phone at an item → an AI model identifies it → you optionally walk through
category-specific guided photo steps (stitching, sole, holo, dial, etc.) → a premium vision
model scores each step → a deterministic verdict engine combines the scores into
**Authentic / Counterfeit / Inconclusive** with a confidence number → you can dispute the
result, and disputes feed a nightly training-data export (the learning loop). No login. Four
launch categories: **sneakers, luxury handbags, Pokémon cards, luxury watches.**

---

## 2. Top-level layout

```
fakecheck/
├── backend/    ASP.NET Core Web API (.NET 10) — layered: Api / Core / Infrastructure / Tests
├── mobile/     Expo SDK 56 (React Native, new architecture) app
├── docs/       spec, deploy notes, security review, legal, and the per-check prompt library (core IP)
├── secrets/    *.env.example templates (real *.env are gitignored)
├── store-assets/  Play Store graphics + screenshots
└── .github/workflows/  CI (backend build+test, mobile lint+test)
```

**Stack (locked):** ASP.NET Core / .NET 10 · React Native (Expo 56) · Cloudflare R2 object
storage · Railway (Docker + managed Postgres) · tiered vision (Gemini Flash for ID, a premium
OpenAI-compatible model for auth checks) · PostHog analytics.

---

## 3. Backend — module map

The backend is a clean 3-project layered solution. `Core` has no I/O and no framework
dependencies; `Infrastructure` implements the `Core` interfaces; `Api` is the thin HTTP layer.

### 3.1 FakeCheck.Api (HTTP surface)

| File | Responsibility |
|---|---|
| `Program.cs` | App bootstrap: Kestrel `PORT` bind, Serilog, FluentValidation auto-validation, ProblemDetails, Swagger (off in prod), **two-layer rate limiting**, migrate+seed on startup, R2/Vision config diagnostics. |
| `Controllers/HealthController.cs` | `GET /health` — Railway liveness probe. |
| `Controllers/UploadsController.cs` | `POST /uploads/presign` — issues presigned R2 PUT URLs. |
| `Controllers/IdentifyController.cs` | `POST /identify` — Tier-1 identification. Rate-limited (`vision`). |
| `Controllers/ScansController.cs` | `POST /scans` — create a scan row after identification. |
| `Controllers/CategoriesController.cs` | `GET /categories/{id}/steps` — ordered guided-step flow. |
| `Controllers/AuthController.cs` | `POST /auth/analyze` — the core multi-photo → verdict orchestration. Rate-limited (`vision`). |
| `Controllers/CorrectionsController.cs` | `POST /corrections` — ingest a user dispute, EXIF-strip supporting photos. |
| `Controllers/AdminController.cs` | `POST /admin/export` — manual learning-loop export, gated by `X-Admin-Token`. |
| `Controllers/LegalController.cs` | `GET /privacy`, `GET /terms` — public HTML legal pages (so the store listing has real URLs). |
| `Dtos/Dtos.cs` | All request/response records. |
| `Validation/Validators.cs` | FluentValidation rules for every inbound DTO. |

### 3.2 FakeCheck.Core (pure domain — no I/O)

| File | Responsibility |
|---|---|
| `Authentication/VerdictEngine.cs` | **The brain.** Pure, deterministic verdict logic: hard-fail override → weighted average → thresholds with per-product `fake_bar` bump. Fully unit-tested. |
| `Authentication/VerdictModels.cs` | `CheckInput`, `StepStatus`, `VerdictInput`, `VerdictResult`. |
| `Authentication/VerificationServices.cs` | Per-category suggestions (StockX, Entrupy, PSA, etc.) returned on an Inconclusive verdict. |
| `Authentication/Enums.cs` | `CheckResult` (Pass/Fail/Inconclusive), `VerdictKind` (Authentic/Counterfeit/Inconclusive). |
| `Abstractions/*.cs` | Interfaces: `IScanRepository`, `IStorageClient`, `IVisionClient`, `IDatasetExporter` (the seams Infrastructure implements). |
| `Models/*.cs` | EF entities: Category, Product, AuthStep, Scan, ScanPhoto, Check, Verdict, Correction, AuditLog, Requirement. |

### 3.3 FakeCheck.Infrastructure (implementations)

| File | Responsibility |
|---|---|
| `Vision/TieredVisionClient.cs` | Tier-1 (Gemini Flash, native JSON) + Tier-2 (OpenAI-compatible chat w/ inline base64 image). Defensive JSON parsing: clean → one repair attempt → downgrade to inconclusive, **never throws**. Also `NormalizeCategory()` (synonym → canonical slug). |
| `Vision/PromptLibrary.cs` | Loads per-check system prompts from `docs/prompts/{category}/{checkId}.md`, cached. Generic fallback if a file is missing. |
| `Storage/R2StorageClient.cs` | Presigned PUT generation; correction-copy re-encode (ImageSharp) that strips EXIF/IPTC/XMP; dataset JSONL writer. |
| `Data/FakeCheckDbContext.cs` | EF model mapping (Postgres, jsonb columns, indexes incl. the corrections AI-filtering index). |
| `Data/DbSeeder.cs` | Upserts 4 categories + 16 products (with `fake_bar`) + the full guided-step flows. |
| `Repositories/ScanRepository.cs` | EF implementation of the persistence boundary. |
| `Learning/CorrectionsExporter.cs` | Builds labeled JSONL (AI verdict + per-check analysis paired with user ground truth) → R2. |
| `Learning/NightlyExportService.cs` | In-process `BackgroundService` cron — fires once/day at `RunHourUtc`, 25h overlap window. |
| `Options.cs` | Strongly-typed config: `R2Options`, `VisionOptions` (Gemini + Premium), `ExportOptions`. |
| `DependencyInjection.cs` | Wires everything; converts Railway `DATABASE_URL` → Npgsql string. |

### 3.4 FakeCheck.Tests
`VerdictEngineTests.cs` (15 tests on the verdict math) + `CategoryNormalizationTests.cs`. xUnit.

---

## 4. Backend — the core request flow (`POST /auth/analyze`)

This is the most important path in the system. Sequence:

1. Look up the category's `auth_steps`; 404 if the category is unknown.
2. Filter submitted photos to known `checkId`s and **cap at `MaxAuthCallsPerScan` (8)** — the cost guardrail.
3. For each photo: load the step prompt, call the **premium** vision model, parse the JSON result into a `CheckInput` (score, weight from the step, result, hard-fail flag, observation).
4. Build required-step gating status and load the product's `fake_bar` if a `ProductId` was supplied.
5. `VerdictEngine.Evaluate(...)` → verdict.
6. Best-effort persist checks + verdict (analysis still returns even if the DB write fails).
7. Return verdict + per-check breakdown + disclaimer + (if inconclusive) suggested verification services.

### Verdict engine rules (the IP, `VerdictEngine.cs`)
- **Hard-fail override:** any critical check (weight ≥ 3) that returns `hard_fail && Fail` ⇒ immediate **Counterfeit**.
- **Weighted average:** `Σ(score × weight) / Σ(weight)` over completed checks.
- **Thresholds:** `≥ 80 + fake_bar` ⇒ Authentic · `≥ 50` ⇒ Inconclusive · else Counterfeit.
- **`fake_bar`** raises the Authentic bar for high-counterfeit products (Yeezy, LV, etc.).
- No checks ⇒ Inconclusive (with suggested services).
- _Note (as built):_ the required-step gate is currently **bypassed** — all steps are treated as optional (`missingRequired` is always empty).

---

## 5. Mobile — module map

Expo SDK 56, React Native 0.85 / React 19, new architecture enabled. State via Zustand,
server state via React Query, local persistence via SQLite, secrets via SecureStore.

### 5.1 Screens (the user flow, in order)

| Screen | Role |
|---|---|
| `HomeScreen` | Camera opens on launch (no login). Capture → identify. |
| `IdentificationResultScreen` | Shows Tier-1 ID result + alternatives; choose to authenticate or not. |
| `AuthIntroScreen` | "N more photos, ~60–90s", previews the step flow, Start / Not now. |
| `GuidedStepsScreen` | Per-step guided capture: progress, instruction, reference image, tip, skip-if-optional. |
| `ProcessingScreen` | Scanning animation + rotating tips while `POST /auth/analyze` runs. |
| `VerdictScreen` | Verdict, confidence ring, per-check breakdown, disclaimer, dispute entry. |
| `CorrectionScreen` | Dispute form (authentic/fake/unsure + 20–500 char explanation + ≤3 photos), optimistic + offline-queued. |
| `HistoryScreen` | Local scan history with filters (incl. Disputed); delete/clear. |
| `SettingsScreen` | Camera quality, clear history, etc. |

### 5.2 Supporting modules

| Area | Files | Responsibility |
|---|---|---|
| **API** | `api/client.ts` | Axios instance; injects `X-Device-Id` header; base URL from env/`expoConfig`. |
| | `api/endpoints.ts` | Typed wrappers over each backend route. |
| | `api/hooks.ts` | React Query `useQuery`/`useMutation` hooks. |
| | `api/upload.ts` | Presign + PUT to R2 using `expo-file-system` `uploadAsync` (binary, not Blob — Blob uploaded 0 bytes on RN). |
| | `api/imagePipeline.ts` | Downscale + JPEG-compress by quality tier; cheap **blur proxy** (bytes-per-pixel heuristic); camera-EXIF/screenshot flag. |
| | `api/deviceId.ts` | Generates + persists an anonymous UUID in SecureStore. |
| | `api/correctionSync.ts` | Drains the offline correction outbox on launch + on reconnect. |
| **State** | `store/scanStore.ts` | The in-flight scan (photos, identification, steps, verdict). |
| | `store/settingsStore.ts` | Camera quality + persisted prefs. |
| **Local DB** | `db/index.ts` | SQLite schema + helpers: `scans`, `checks`, `correction_outbox`. History + offline queue live here. |
| **Analytics** | `analytics/{client,events,index}.ts` | Lazy PostHog wrapper; **no-op if no key**; funnel events across the flow. |
| **Theme/UI** | `theme/*`, `components/*` | Palette, typography, `ConfidenceRing`, `CameraCapture`, `PrimaryButton`, `SplashScreen`, `Screen`. |
| **Nav** | `navigation/RootNavigator.tsx`, `types.ts` | Native-stack navigation + typed routes. |

### 5.3 Offline & resilience design (built-in)
- Every completed scan is mirrored to SQLite, so **History works offline**.
- Disputes are written to a local `correction_outbox` and submitted optimistically; a flush
  drains them on reconnect — a dispute never fails because the user is offline.
- Analytics can never throw into the UI; the vision client never throws on bad model output.

---

## 6. Data model (Postgres, via EF)

| Table | Key columns | Notes |
|---|---|---|
| `categories` | id (slug), display_name, active | 4 seeded. |
| `products` | id (slug), category_id, brand, line, **fake_bar** numeric(5,2) | 16 seeded; `fake_bar` drives the elevated Authentic bar. |
| `auth_steps` | id, category_id, ordinal, check_id, instruction_title, tip_text, reference_image_url, requirement, weight, condition_json (jsonb) | The guided flow; weight 1/2/3 = supporting/strong/critical. |
| `scans` | id (guid), device_id, category_id, product_id, status, created_at | Indexed by device_id + created_at. |
| `scan_photos` | id, scan_id, image_url | |
| `checks` | id, scan_id, check_id, score, result, observation, raw_model_json (jsonb) | Raw model JSON retained for training. |
| `verdicts` | id, scan_id, result, overall_confidence, hard_fail_triggered | |
| `corrections` | id, scan_id, user_correction, explanation, supporting_image_urls (text[]), original_verdict, original_confidence, item_category, product_id, original_checks (jsonb), all_scan_image_urls (text[]), app_version, platform | **Index on (item_category, product_id, user_correction)** for dataset filtering. |
| `audit_logs` | id, scan_id, event, payload (jsonb) | Defined; lightly used. |

Schema is created on boot from the EF model (no migration files exist yet — see Recommendations).

---

## 7. The learning loop (self-improving system)

1. User disputes a verdict → `POST /corrections`.
2. Supporting photos are copied into the corrections bucket **EXIF-stripped**.
3. Row stored as ground truth (with the original AI analysis attached).
4. `NightlyExportService` fires daily → `CorrectionsExporter` builds **labeled JSONL** pairing
   the AI's original verdict + per-check `raw_model_json` with the user's corrected label →
   written to R2 `datasets/corrections/…`.
5. That JSONL is the training/eval corpus for improving prompts or fine-tuning later.

This is the data-capture flywheel: every disagreement becomes a labeled example.

---

## 8. Cross-cutting concerns (where to look)

| Concern | Where |
|---|---|
| **Rate limiting** | `Program.cs` — global 60/min per `X-Device-Id` + per-IP 20/min `vision` policy on paid endpoints. |
| **Input validation** | `Validation/Validators.cs` — allow-lists, length caps, count caps. |
| **Secrets** | `secrets/` (gitignored real values); injected via Railway/env. Verified none committed. |
| **Privacy / EXIF** | `R2StorageClient.CopyToCorrectionsStrippedAsync`; `imagePipeline.ts` capture flags; legal pages in `LegalController`. |
| **Cost guardrails** | `MaxAuthCallsPerScan` (8), presign count ≤12, image downscale before upload. |
| **Observability** | Serilog (backend) + PostHog funnel events (mobile). |
| **CI** | `.github/workflows/ci.yml` — backend build+test; mobile lint+test gated on lockfile. |
| **Deploy** | Railway (`railway.json`, `backend/Dockerfile`); OTA via `expo-updates`; local native builds. |

---

## 9. Config & environment knobs

| Setting | Default | Effect |
|---|---|---|
| `Vision:MaxAuthCallsPerScan` | 8 | Premium calls per scan (cost cap). |
| `Vision:TimeoutSeconds` | 30 | Per-call vision timeout → inconclusive. |
| `Vision:Gemini:Model` | gemini-2.5-flash | Tier-1 ID model. |
| `Vision:Premium:*` | openai / gpt-4o | Tier-2 auth model (provider-swappable). |
| `RateLimit:GlobalPerDevicePerMinute` | 60 | Broad per-device cap. |
| `RateLimit:VisionPerIpPerMinute` | 20 | Per-IP cap on paid endpoints. |
| `R2:PresignTtlMinutes` | 15 | Presigned URL lifetime. |
| `Export:RunHourUtc` | 7 | Nightly export hour. |
| `Export:AdminToken` | "" (disabled) | Gate for `POST /admin/export`. |
| `Swagger:Enabled` | false | Public API schema (dev only). |

---

_Companion document: `RECOMMENDATIONS.md` — where and what to extend (security, scalability, features)._
