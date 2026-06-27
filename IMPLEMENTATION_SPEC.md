# Snap Check — Implementation Spec

_Generated: 28 June 2026 · Companion to `RECOMMENDATIONS.md` and `ARCHITECTURE_MAP.md`._

Concrete build spec for every idea discussed. Each section gives the **goal**, exact **data-model**
and **DTO/API** changes, the **files touched** (real paths verified against the current code), and
**acceptance criteria**. Written to match the codebase's existing patterns (layered .NET, EF, Zustand
+ React Query, FluentValidation) and the project's principles: simplest thing that works, surgical
changes, success criteria first.

> **Sequencing note.** Do §0 (migrations) first — several specs add columns/tables and you want real
> migrations before touching the schema. Then §1 (the `fake_bar` bug) since it's tiny and high-value.
> §2 (multi-image ID), §6 (rarity/value), and §7 (usage meters) are the product core. §4 (providers)
> and §5 (accounts) are larger infra tracks that can run in parallel.

---

## §0. Foundation: real EF migrations — P0, M

**Goal:** replace schema-create-on-boot with versioned migrations so every later spec can add
columns safely.

**Why now:** `Program.cs` builds schema via `GenerateCreateScript()` (no migration files), while
`DbSeeder.SeedAsync` calls `MigrateAsync()` — inconsistent, and neither can evolve a live DB.

**Steps (on an SDK-equipped machine):**
```bash
cd backend
dotnet ef migrations add InitialCreate \
  --project FakeCheck.Infrastructure --startup-project FakeCheck.Api
# review the generated migration matches the current live schema, then:
dotnet ef database update \
  --project FakeCheck.Infrastructure --startup-project FakeCheck.Api
```
- Generate `InitialCreate` from the current model; verify the diff against the live Railway DB
  (it should be a no-op apply since the tables already exist — use `--idempotent` script to confirm).
- In `Program.cs`, replace the probe-and-`GenerateCreateScript` block with `await db.Database.MigrateAsync()`.
- Keep `DbSeeder` idempotent as-is.

**Files:** `backend/FakeCheck.Api/Program.cs`, new `backend/FakeCheck.Infrastructure/Migrations/*`.
**Acceptance:** fresh DB boots to full schema via migrations; existing DB applies cleanly with no data
loss; `MigrateOnStartup=true` path no longer calls `GenerateCreateScript`.

---

## §1. Fix `fake_bar` product resolution — P1, S — bug

**Goal:** make the per-product elevated Authentic threshold actually fire.

**Problem (verified):** `scanStore.setIdentification` sets `productId = r.productLine` (free text,
e.g. `"Air Jordan 1"`). `AuthController.Analyze` → `GetProductAsync(req.ProductId)` matches on the
**slug PK** (`"nike_air_jordan_1"`). They never match → `fakeBar` always `0`.

**Chosen approach (server-authoritative):** resolve to a canonical product slug in the backend, so
the client never has to know slugs.

**Data/code changes:**
1. Add a resolver in `FakeCheck.Core` (pure, testable):
   `ProductResolver.Resolve(string category, string? brand, string? line) → string? slug`.
   Implementation: normalise + match against the seeded `(brand, line)` pairs (case/space-insensitive,
   contains-match), e.g. `Nike` + `Air Jordan 1` → `nike_air_jordan_1`. Back it with the `products`
   table (load once, cache) rather than a hardcoded map so new seeds work automatically.
2. In `AuthController.Analyze`, before loading `fake_bar`: if `req.ProductId` doesn't resolve to a
   product, try `ProductResolver` using the scan's identification brand/line.
   _Simplest variant:_ resolve at `/identify` time and return `product_id` (slug) in
   `IdentificationResult` (see §6 — it already gains fields), then the client passes the slug through.
3. Mobile: `scanStore.setIdentification` should set `productId = r.productId ?? null` (the new slug),
   not `productLine`.

**Files:** new `backend/FakeCheck.Core/Authentication/ProductResolver.cs` (+ unit tests in
`FakeCheck.Tests`), `backend/FakeCheck.Api/Controllers/AuthController.cs` and/or `IdentifyController.cs`,
`backend/FakeCheck.Infrastructure/Vision/TieredVisionClient.cs` (populate `product_id`),
`mobile/src/store/scanStore.ts`, `mobile/src/api/types.ts`.
**Acceptance:** a unit test asserts `Nike/"Air Jordan 1"` → `nike_air_jordan_1`; an analyze against a
Yeezy/LV/Rolex item applies the seeded `fake_bar` (verify `authenticThreshold` rises). Add a regression
test that the old free-text path no longer silently yields `fakeBar = 0`.

---

## §2. Multi-image identification & honest confidence — P1, M

**Goal:** keep one-shot ID as default; let users add 1–4 angles and re-identify in one call; show an
honest, coverage-aware confidence.

### 2.1 API/DTO changes
- `IdentifyRequest`: `record IdentifyRequest(IReadOnlyList<string> ImageKeys)` (was single `ImageKey`).
  Keep a back-compat: accept `ImageKey` too, or have the client always send an array of length ≥1.
- `IVisionClient.IdentifyAsync(IReadOnlyList<string> imageKeys, CancellationToken)` — attach each key
  as an extra `inline_data` part in the **single** Gemini `contents.parts` array (preferred: pass
  presigned GET URLs per §4.4 to avoid base64 buffering).
- `IdentificationResult` gains `imageCount` and the confidence is **already** post-processed (see 2.2).
- Validator: `ImageKeys` `NotEmpty`, `Count <= 4`, each `MaximumLength(512)`.

### 2.2 Confidence policy (in `VerdictEngine`/a new `ConfidencePolicy` helper — pure)
- `DisplayConfidence(rawModelConfidence, imageCount, agreementSignal) → (score, band)`.
- Rules to start (tune later, §6.4 of RECOMMENDATIONS / calibration):
  - 1 image → clamp display to ≤ 70 and label band **"Best guess"**.
  - ≥ 2 images that agree on category+brand+line → allow full band; add a small bonus per
    corroborating angle (cap 100).
  - Contradiction across angles or any frame flagged blurry (client `isLikelyBlurry`) → subtract and
    surface "add a clearer shot of the label/logo".
- Keep it pure + unit-tested, same as `VerdictEngine`.

### 2.3 Mobile UX
- `IdentificationResultScreen` already has: a `<40` low-confidence warning and an unsupported-category
  path — **build on these, don't replace.** Add:
  - An **"Add another angle"** button → opens `CameraCapture`, uploads via `uploadImagesAsync`, pushes
    keys into `scanStore.photos` (checkId `"primary"` or new `"primary_2"…`).
  - A **"Re-identify"** button (enabled once ≥1 extra angle added) → calls `useIdentify` with all
    primary image keys → updates identification + confidence.
  - Show the band label ("Best guess" vs "Confident") next to `ConfidenceRing`.
- Add `scanStore` support for multiple primary keys (today `addPhoto` already appends; just collect the
  `"primary*"` ones for the identify call).

**Files:** `Dtos.cs`, `Validation/Validators.cs`, `IVisionClient.cs`, `TieredVisionClient.cs`,
`IdentifyController.cs`, new `FakeCheck.Core/Authentication/ConfidencePolicy.cs` (+tests),
`mobile/src/api/{types,endpoints,hooks,upload}.ts`, `mobile/src/screens/IdentificationResultScreen.tsx`,
`mobile/src/store/scanStore.ts`.
**Acceptance:** single-image ID never shows > 70 / shows "Best guess"; adding a corroborating angle
raises it; one `/identify` call carries N images; confidence policy unit-tested.

---

## §3. Rarity score & estimated market value — P1, M (+ data moat, §3.4)

**Goal:** on any identified item show a **rarity tier/score** and an **estimated value range**.

### 3.1 Model output (Phase 1 — extend the existing identify call)
Extend the Tier-1 prompt + `IdentificationResult` with:
```
rarity_score      int 0–100        (nullable)
rarity_tier       "common"|"uncommon"|"rare"|"grail"  (nullable)
est_value_low     decimal?         (nullable)
est_value_high    decimal?         (nullable)
currency          string  default "USD"
value_basis       "model_estimate"|"market_comps"
value_as_of       DateTimeOffset
```
- Add these keys to the strict-JSON schema in `TieredVisionClient.IdentifyAsync`, parsed with the
  existing defensive `GetInt`/`GetNullableString` helpers (add a `GetDecimal`).
- For unsupported/generic items (the lamp case) the model must return nulls → UI shows "no reliable
  market data" rather than a fabricated number.
- **Disclaimer**, mirroring `VerdictEngine.Disclaimer`: const `"Estimated value — informational only,
  not an appraisal. Prices fluctuate."`

### 3.2 Mobile UI
- `IdentificationResultScreen` `metaCard`: add a **value chip** (range) and a **rarity badge**
  (colour by tier). Free tier shows range + tier; Plus shows full estimate + price history (§5/§12).
- Reuse the existing `metaRow` styling; add the disclaimer line under the card.

### 3.3 Phase 2 — real comps (later, P2)
- New `IMarketDataClient` abstraction in `Core`, per-category implementations in `Infrastructure`.
  Candidate sources (verify API access/terms before building):
  - **pokemon:** TCGplayer or PriceCharting API.
  - **sneaker:** eBay sold/Marketplace-Insights comps (StockX/GOAT have no open API).
  - **watch:** Chrono24 (no public API → partner/later), interim eBay comps.
  - **handbag:** Fashionphile/The RealReal + eBay comps.
- Cache comps server-side keyed by resolved `product_id` (TTL e.g. 24h) so paid APIs aren't hit per
  scan. Set `value_basis = "market_comps"` when used.

### 3.4 Rarity data moat — `product_scan_stats` rollup — P2, M
**This is the defensible piece: how often the app sees an item is an inverse-rarity signal.**

**New table `product_scan_stats`** (one row per resolved product slug):
```
product_id        text PK   (FK products.id; nullable bucket "unresolved:{brand}:{line}" allowed)
category_id       text not null
scan_count        bigint not null default 0
first_seen_at     timestamptz not null
last_seen_at      timestamptz not null
rarity_percentile numeric(5,2) null   -- 0..100, recomputed by a job; lower count => rarer => higher rarity
updated_at        timestamptz not null
```
- **Write path:** on each successful identify (or scan create), `UPSERT … scan_count = scan_count+1,
  last_seen_at = now()` for the resolved product. Do it best-effort/async so it never blocks the
  response (same posture as existing best-effort persistence). Keyed on the **resolved slug** (§1) so
  it's meaningful; unresolved items aggregate under a synthetic key and can be promoted later.
- **Compute path:** a nightly job (reuse the `NightlyExportService` cron pattern, or a new
  `RarityRollupService`) ranks products **within each category** by `scan_count` and writes
  `rarity_percentile` (rarer = seen-less = higher rarity). Blend with the model's `rarity_score`:
  e.g. `final_rarity = 0.6*model + 0.4*(100 - frequency_percentile)` once you have enough volume
  (guard with a minimum-sample threshold; until then, fall back to the model score).
- **Read path:** identify response's `rarity_score` is the blended value when stats exist.
- **Privacy:** counts only, no device linkage in this table — pure aggregate. Safe.

**Files:** `TieredVisionClient.cs` (prompt + parse), `IVisionClient`/`IdentificationResult`,
`IdentifyController.cs` (trigger stat upsert), new `Models/ProductScanStat.cs`,
`FakeCheckDbContext.cs` (+ migration), new `Repositories` method + `Learning/RarityRollupService.cs`,
`mobile/src/api/types.ts`, `IdentificationResultScreen.tsx`.
**Acceptance:** identify returns rarity + value (or nulls for generic items); `scan_count` increments
per identify; nightly job populates `rarity_percentile`; a rare seeded item (e.g. `pokemon_base_set`)
trends to a higher rarity than a common one as scans accrue; generic items show "no market data".

---

## §4. Vision-provider fallback chain — P1, M

**Goal:** ordered providers per tier with automatic failover + retry; route by cost.

### 4.1 Config (extend `VisionOptions`)
Turn each tier into an **ordered list**:
```jsonc
"Vision": {
  "Identify":  [ { "Provider":"gemini",     "Model":"gemini-flash-…", "ApiKey":"…", "BaseUrl":"…" },
                 { "Provider":"openrouter",  "Model":"…llama-3.2-11b-vision", "ApiKey":"…", "BaseUrl":"…" } ],
  "Premium":   [ { "Provider":"openai|gemini", "Model":"…", … },
                 { "Provider":"groq", "Model":"llama-3.2-11b-vision", … } ],
  "MaxAuthCallsPerScan": 8, "TimeoutSeconds": 30, "PerProviderRetries": 1
}
```
- Keep the current single-provider shape working (bind a 1-element list if the old keys are present)
  to avoid a breaking config change.

### 4.2 Client
- `TieredVisionClient` iterates the tier's provider list: try provider → on `429`/timeout/`5xx`/parse
  failure, do `PerProviderRetries` with jitter, then fall through to the next provider; only after the
  last provider fails does it downgrade to inconclusive (today's behaviour becomes the final step).
- Add **`Microsoft.Extensions.Http.Resilience`** (or Polly) to the named `HttpClient` for the
  retry/backoff (also satisfies RECOMMENDATIONS §3.3).
- Record `provider`, `latencyMs`, `attempt` per call → Serilog + a metric (RECOMMENDATIONS §8.3).

**Provider menu (June 2026, verify before committing):** Tier-1 free on **Gemini free tier**
(~1,500 req/day, multimodal) with **OpenRouter free** (Llama 3.2 11B Vision) overflow; Tier-2 strong
primary with **Groq Llama Vision (~$0.18/M)** as cheap fast fallback.

**Files:** `Options.cs`, `DependencyInjection.cs`, `TieredVisionClient.cs`, `appsettings.json`,
`secrets/backend.env.example`.
**Acceptance:** killing the primary (bad key) still returns a result via the backup; logs show which
provider served each call; a forced `429` triggers one retry then failover; old single-provider config
still boots.

---

## §5. User accounts (optional, anonymous-first) — P1, L

**Goal:** keep launch account-free; offer optional sign-in (Google/Apple/Facebook/email) that links
the existing `device_id`, enabling sync, per-user limits, and the §7 paywall.

### 5.1 Data model
```
users:    id uuid PK, email text unique null, auth_provider text, provider_subject text,
          entitlement text default 'free'   -- free|plus|pro
          created_at, last_seen_at
device_links: device_id text, user_id uuid FK, linked_at   (PK device_id)
-- add nullable user_id to: scans, corrections   (anonymous rows keep user_id null)
```

### 5.2 Auth approach (lean — recommend managed)
- **Recommended:** a managed provider (Supabase Auth fits — already on Postgres; or Firebase Auth).
  Backend **validates the provider's JWT** on incoming requests; resolve-or-create `users` row by
  `(auth_provider, provider_subject)`; upsert `device_links` linking the caller's `X-Device-Id`.
- Alternative (no extra vendor, more work): ASP.NET Core Identity + external providers.
- **Apple Guideline 4.8:** offering Google/Facebook **requires** Sign in with Apple on iOS — include
  it. Add email **magic-link** as the low-friction traditional option.

### 5.3 Backend
- New `AuthN` middleware: if a `Bearer` token is present, validate it and attach `user_id`; requests
  without one stay anonymous (device-id only). **No endpoint becomes mandatory-auth.**
- On link, migrate local history server-side: client posts its SQLite scans to a new
  `POST /account/import` (best-effort, idempotent by scan id).
- Ownership checks (RECOMMENDATIONS §1.1) key on `user_id` when present, else `device_id`.

### 5.4 Mobile
- `expo-auth-session` (Google/Facebook), `expo-apple-authentication` (Apple), tokens in the existing
  `expo-secure-store`. New `authStore` (Zustand) + optional Sign-in screen reached from `Settings`
  and from the soft-gate upsell (§7).
- Keep first run camera-first; never block on auth.

### 5.5 Legal
- Update `LegalController` Privacy/Terms: they currently promise "no account and no personal
  information" — that changes once email is stored. Keep training data keyed to anonymous ids, not
  emails (RECOMMENDATIONS §9.4 / SECURITY_REVIEW #5).

**Files:** new `Models/{User,DeviceLink}.cs`, `FakeCheckDbContext.cs` (+migration), new
`Controllers/AccountController.cs`, auth middleware in `Program.cs`, `LegalController.cs`;
mobile `src/store/authStore.ts`, new `screens/SignInScreen.tsx`, `navigation/types.ts`,
`api/client.ts` (attach `Authorization` when signed in).
**Acceptance:** anonymous flow unchanged; a user can sign in with each provider; signing in links the
device and imports prior history; `scans.user_id` populated for authed scans; Apple sign-in present on
iOS; privacy policy updated.

---

## §6. Usage meters & entitlements (freemium) — P1, S→M

**Goal:** enforce the two free caps server-side; gate softly in the UI.

### 6.1 Limits (config-driven)
```jsonc
"Limits": { "FreeIdentifyPerDay": 10, "FreeDeepChecksPerMonth": 5 }
```

### 6.2 Server-side counters
- Reuse the rate-limiter partitioning style already in `Program.cs`. Two counters keyed by
  `user_id ?? device_id`:
  - **identify/day:** increment in `IdentifyController`; window = rolling calendar day (UTC).
  - **deep-checks/month:** increment in `AuthController.Analyze`; window = calendar month.
- Storage: a small `usage_counters(subject, kind, window_start, count)` table (durable across restarts
  and instances — don't use in-memory for billing) **or** Redis if you wire it (RECOMMENDATIONS §2.4).
- **Entitlement bypass:** `plus`/`pro` users skip the caps (look up `users.entitlement`).
- On cap exceeded → `429` with a typed ProblemDetails `code: "quota_exceeded", meter: "identify|deep_check"`.

### 6.3 Billing (entitlement source of truth)
- **RevenueCat** over store IAP (`expo-in-app-purchases`); Apple/Google require IAP for digital goods.
- RevenueCat webhook → backend sets `users.entitlement`. Backend never trusts the client for tier.

### 6.4 Mobile
- Catch `quota_exceeded` in `ProcessingScreen`/`IdentificationResultScreen`; show an upgrade sheet
  (anonymous → "create an account for more"; free user → "go Plus"). Don't hard-error.

**Files:** `Options.cs`/`appsettings.json` (`Limits`), new `Models/UsageCounter.cs` +
repo + migration, `IdentifyController.cs`, `AuthController.cs`, ProblemDetails shaping;
mobile upsell UI + `api` error handling, RevenueCat SDK + webhook controller.
**Acceptance:** 11th identify in a day by a free subject → `429 quota_exceeded`; 6th deep-check in a
month → `429`; Plus user unmetered; counters survive a restart; upgrade prompt shows instead of error.

---

## §7. Usage instrumentation (do this **now**, before charging) — P1, S

**Goal:** measure real identify + deep-check volume per subject so the §6 caps are evidence-based.

- Mobile: extend `analytics/events.ts` `EventProps` with
  `identify_completed: { category; imageCount; confidence; band }` and reuse existing
  `verdict_received` for deep-checks. Add `analytics.identifyCompleted(...)` to the facade in
  `analytics/index.ts`; call it in `IdentificationResultScreen` after a successful identify.
- Optionally also count server-side (Serilog event) keyed by subject so you see distribution without
  client sampling bias.
- After ~1–2 weeks of testing, read the per-subject daily-identify and monthly-deep-check distributions
  and confirm/adjust the `10/day` + `3–5/month` caps.

**Files:** `mobile/src/analytics/{events,index}.ts`, `IdentificationResultScreen.tsx`.
**Acceptance:** PostHog shows `identify_completed` with image count; you can chart identifies-per-device
-per-day and deep-checks-per-device-per-month.

---

## §8. Learning-loop upgrades — P1–P2

### 8.1 Capture confirmations, not just disputes — P1, M
- Add a **"Looks right" 👍** action on `VerdictScreen` → `POST /corrections` with
  `userCorrection = "authentic"` (or a dedicated `confirmation` flag) so positives enter the dataset.
  `analytics.correctionSubmitted` already maps a `confirmed` direction — wire the UI to it.
- This fixes the label bias (only disagreements today) and makes the JSONL usable for real eval.

### 8.2 Prompt versioning tied to results — P1, M
- Store a prompt **version/hash** on each `Check`: add `prompt_version text` to `checks`; `PromptLibrary`
  computes a content hash per `{category}/{checkId}` and `AuthController` stamps it on the persisted
  `Check` and into the export record. Lets you measure lift between prompt revisions.

### 8.3 Offline eval harness — P2, M
- A job/CLI that replays the labeled JSONL against current prompts and reports accuracy per
  category/check (turns "data collection" into "improvement"). Natural home: a new console tool under
  `backend/tools/` next to `verify_verdict_math.mjs`.

**Files:** `VerdictScreen.tsx`, `corrections` flow; `Models/Check.cs` + migration, `PromptLibrary.cs`,
`AuthController.cs`, `CorrectionsExporter.cs`; new eval tool.
**Acceptance:** a confirmed verdict creates a positive-label correction row; each check stores its
prompt version; eval tool prints per-category accuracy from a JSONL file.

---

## §9. Security & reliability hardening — P0/P1 (from RECOMMENDATIONS §1–§3)

| Item | Change | File(s) |
|---|---|---|
| Ownership binding (§1.1) | Require `X-Device-Id`/`user_id` to match the scan owner on analyze/corrections; reject image keys not linked to the scan | `AuthController.cs`, `CorrectionsController.cs`, persist `scan_photos` |
| Parallel vision calls (§2.1) | `Task.WhenAll` over a `SemaphoreSlim` (e.g. 4) in the analyze loop | `AuthController.cs` |
| Idempotent analyze (§3.1) | Upsert checks by `(scanId, checkId)`; replace verdict; or accept idempotency key | `ScanRepository.cs`, `AuthController.cs` |
| Vision retry/backoff (§3.3) | Polly/Resilience on the named HttpClient (folds into §4) | `TieredVisionClient.cs`, DI |
| Request size limit (§1.3) | Kestrel `MaxRequestBodySize` + presigned-POST size cap | `Program.cs`, `R2StorageClient.cs` |
| Constant-time token (§1.2) | `CryptographicOperations.FixedTimeEquals` | `AdminController.cs` |
| Gemini key in header (§1.4) | `x-goog-api-key` header instead of `?key=` | `TieredVisionClient.cs` |
| Persistence-failure metric (§3.2) | Emit a counter when best-effort DB writes throw | `AuthController.cs` |
| Redis-backed limiter (§2.4) | Move rate limiter + usage counters to Redis before multi-instance | `Program.cs`, DI |

**Acceptance:** analyze for an 8-photo scan completes in ~¼ the wall-clock of the sequential version;
a retried analyze produces no duplicate `checks`/`verdicts` rows; cross-device scan id is rejected;
oversized upload is refused.

---

## §10. Product polish & growth — P2 (from RECOMMENDATIONS §5, §10, §11)

- **Shareable verdict card** (`VerdictScreen` → render-to-image + Share sheet; watermark on free).
- **Coverage banner** on low-photo verdicts (re-surface the bypassed required-step gate as a warning).
- **Reference image side-by-side** at verdict (the `reference` bucket exists; `auth_steps` already
  carry `reference_image_url`).
- **Affiliate hand-off** on Inconclusive (`SuggestedVerificationServices` → real affiliate links + click
  tracking).
- **Push** (`expo-notifications`), **Play Integrity/App Attest**, **cost dashboard**, **prompt A/B**,
  **i18n** (extract inline strings), **accessibility** pass, **referral loop**.
- **Repo hygiene:** remove `_deltest.tmp`, the committed `docs/WhatsApp …mp4`, the `stage()` TEMP
  diagnostic in `upload.ts`, and the verbose env-key logging block in `Program.cs`; keep the three
  `version` fields in sync.

---

## Build order (suggested)

1. **§0 migrations** → **§1 fake_bar fix** → **§7 instrumentation** (all small, unblock everything).
2. **§2 multi-image ID** + **§3.1–3.2 rarity/value (model-based)** — the visible product wins.
3. **§9 hardening** (parallel calls, ownership, idempotency) — before more users.
4. **§4 provider chain** + **§5 accounts** — parallel infra tracks.
5. **§6 freemium meters** (needs §5) → **§3.3 real comps**, **§3.4 rarity-moat rollup**, **§8 learning**, **§10 growth**.

Every section is additive and matches existing patterns — no rewrite required.
