# Snap Check — Deep-Dive Recommendations

_Generated: 28 June 2026 · No code changed — this is a review only._

Read with `ARCHITECTURE_MAP.md`. This builds on the existing `docs/SECURITY_REVIEW.md`
(Phase 13) rather than repeating it; items already tracked there are referenced, not restated.

Each item has a **priority** (P0 = do before scaling users, P1 = soon, P2 = opportunistic) and a
rough **effort** (S/M/L). The app is in testing and architecturally solid — most of this is
hardening and growth, not firefighting.

---

## TL;DR — the five things I'd do first

1. **Parallelize the premium vision calls** in `/auth/analyze` (currently sequential — up to 8× latency). _P0, S._ Biggest UX + throughput win for the least work.
2. **Bind scans/photos to the device that owns them** (`scanId` + image keys are currently unvalidated). _P0, M._
3. **Generate real EF migrations** instead of create-schema-on-boot. _P0, M._ Required before you can safely change the schema on a live DB.
4. **Make `/auth/analyze` idempotent** so a retry doesn't write duplicate checks/verdicts. _P1, S._
5. **Capture confirmations, not just disputes**, in the learning loop (fix the label bias). _P1, M._ This is what makes the "self-learning" claim actually hold.

> **Expanded in this revision:** §7 multi-image identification & confidence policy · §8 vision-provider fallback + free/backup providers · §9 user accounts (Google/Facebook/Apple/email) · §10 further areas · §12 monetization & freemium model (incl. 10/day free identify cap) · §13 rarity score & estimated market value.

---

## 1. Security

The Phase-13 review already covers Swagger, the spoofable rate-limit key, presign size cap, admin
exception leakage, PII in explanations, and the 30-day lifecycle rule. New or under-weighted items:

### 1.1 No ownership binding on scans/images — P0, M
`POST /auth/analyze` and `POST /corrections` accept any `ScanId` and any image **key** with no
check that they belong to the calling device. Keys are server-generated GUIDs (not enumerable),
which is the main protection — but there's nothing stopping a client that holds one scan/key from
attaching analysis or corrections to **another** scan id, or asking the backend to run paid vision
on / EXIF-copy an arbitrary key it happens to know. Impact is bounded today (anonymous, GUID keys),
but it's the kind of gap that bites once there's anything worth abusing.
_Fix:_ stamp `device_id` on every scan (already stored) and require the `X-Device-Id` header to
match the scan's owner on analyze/corrections; reject image keys not linked to that scan.

### 1.2 Admin token compare is not constant-time — P2, S
`AdminController` uses `string.Equals(provided, token, Ordinal)`. The Phase-13 doc calls this
"constant string comparison," but `string.Equals` short-circuits on the first differing byte, so
it's technically timing-attackable. Low real risk (network jitter dwarfs the signal), but use
`CryptographicOperations.FixedTimeEquals` over the UTF-8 bytes to be correct.

### 1.3 No request body size limit → memory pressure / DoS — P1, M
The vision path reads each image fully into memory and base64-encodes it
(`LoadBase64Async` → `ms.ToArray()` → `Convert.ToBase64String`). With no Kestrel
`MaxRequestBodySize` tuning and no R2 object-size cap (Phase-13 finding #3), a handful of large
objects pushed through concurrently can spike memory. Pair the presigned-**POST** size cap with a
Kestrel limit, and consider streaming rather than buffering the whole image.

### 1.4 Gemini key travels in the URL query string — P2, S
Tier-1 calls `…:generateContent?key={ApiKey}`. Query strings are the most likely thing to end up
in an intermediary/access log. Prefer the `x-goog-api-key` header. Minor, but free.

### 1.5 `Trust Server Certificate=true` on DB — P2, info
Set for Railway's private network. Fine there; just don't reuse that connection string against a
public Postgres endpoint where it would defeat TLS verification.

### 1.6 Device id uses `Math.random()` — P2, S
`deviceId.ts` builds the UUID from `Math.random()`. It's only an anonymous fair-use handle, so
collisions/predictability barely matter — but `expo-crypto`'s `randomUUID()` is a one-line upgrade
if you ever tie anything trust-bearing to it.

---

## 2. Scalability & performance

### 2.1 Vision calls run sequentially — P0, S
`AuthController.Analyze` loops `await _vision.RunCheckAsync(...)` one photo at a time. With 8 checks
at ~2–4s each that's a 15–30s wall-clock verdict. Run them with **bounded parallelism**
(`Task.WhenAll` over a `SemaphoreSlim`, e.g. 4 in flight). Same cost, a quarter of the latency, and
it directly improves the `ProcessingScreen` experience. Highest ROI change in the codebase.

### 2.2 Backend relays image bytes it doesn't need to — P1, M
Today bytes flow client → R2 → **backend pulls them back** → base64 → vision provider. Both Gemini
and OpenAI-compatible endpoints accept an image **URL**. Issue a short-lived presigned **GET** and
hand the provider the URL instead of downloading + base64-encoding on the API server. Cuts egress,
memory, and latency, and shrinks the API server's footprint per request.

### 2.3 Schema-create-on-boot + in-process cron assume a single instance — P0/P1, M
Two coupled issues for horizontal scaling:
- **No EF migrations.** `Program.cs` builds the schema from `GenerateCreateScript()` because the
  build sandbox had no SDK. That can't evolve a live schema and races if two instances boot at
  once. Generate real migrations and switch to `MigrateAsync()`. _(P0 — blocks safe schema change.)_
  Note (found on re-verification): `DbSeeder.SeedAsync` **already calls `MigrateAsync()`** even though
  no migration files exist — so the two startup paths (`Program.cs` script-create vs seeder migrate)
  are inconsistent. Generating real migrations resolves both at once.
- **`NightlyExportService` is in-process.** Run two replicas and the export fires twice. Gate it
  behind a single-leader lock (e.g. a Postgres advisory lock) or move it to a scheduled job. _(P1.)_

### 2.4 Rate limiter is in-memory per instance — P1, M
The fixed-window limiter lives in process memory, so limits aren't shared across replicas. The
README already lists Redis in the stack; wire the limiter (and ideally a distributed cache) to
Redis before running more than one instance.

### 2.5 Category steps re-queried on every request — P2, S
`GetStepsAsync` hits Postgres on every `AuthIntro` and every `analyze`. Steps change rarely —
cache them in `IMemoryCache` keyed by category with a short TTL. Trivial DB-load reduction.

### 2.6 ImageSharp re-encode is synchronous-heavy under load — P2, M
`CopyToCorrectionsStrippedAsync` loads the full image into an ImageSharp `Image` to strip EXIF.
Fine at dispute volumes; if corrections ever spike, move it to a queue/worker rather than doing it
inline in the request.

---

## 3. Reliability & correctness

### 3.1 `/auth/analyze` is not idempotent — P1, S
`SaveChecksAsync` always `Add`s, and `ProcessingScreen` retries on failure. A retry for the same
`scanId` writes **duplicate** check + verdict rows, which also pollutes the training export.
Add an idempotency guard: upsert by `(scanId, checkId)` and replace the verdict, or accept a
client idempotency key.

### 3.2 "Best-effort persistence" can silently drop data — P1, S
Analyze returns the verdict even if the DB writes throw (logged only). The user sees a result that
never made it to the DB → history/learning gaps with no signal. Keep the user-facing resilience,
but emit a metric/alert on persistence failures so you notice if it becomes common.

### 3.3 No retry/backoff on transient vision failures — P1, S
A single 429/503 from the model downgrades that check to **inconclusive**, which can swing a
verdict. One bounded retry with jitter (via `Microsoft.Extensions.Http.Resilience`/Polly on the
`HttpClient`) would meaningfully improve verdict quality at trivial cost.

### 3.5 `fake_bar` is effectively never applied (product-slug mismatch) — P1, S — **found on re-verification**
The mobile app sets `productId` from the model's free-text `productLine`
(`scanStore.setIdentification`: `productId = r.productLine`) — e.g. `"Air Jordan 1"`. The backend
resolves the product by **primary-key slug** (`AuthController` → `GetProductAsync(req.ProductId)` →
`Products.FirstOrDefault(p => p.Id == productId)`), where the seeded ids are slugs like
`"nike_air_jordan_1"`. Free-text line ≠ slug, so the lookup almost always misses and
`fakeBar` stays `0` — meaning the **per-product elevated Authentic bar (a core part of
`VerdictEngine`) is silently dead in production.** High-counterfeit items (Yeezy, LV, Birkin, Rolex)
are *not* getting their intended stricter threshold. _Fix:_ resolve the model output to a seeded
product slug server-side (a brand/line → slug matcher, or have `/identify` return a canonical
`product_id`). Specced in the implementation doc (§3 of `IMPLEMENTATION_SPEC.md`).

### 3.4 `scan_photos` isn't populated server-side — P2, M
Analyze persists checks + verdict but never links the uploaded image keys to the scan. That means
server-side 30-day deletion and correction lookups depend on keys the client passes back. Recording
`scan_photos` on upload/analyze would let the backend own retention and ownership checks (ties into
1.1 and SECURITY_REVIEW #6).

---

## 4. The learning loop (your "self-learning" claim)

This is the strategic part — it's what differentiates the product, and it has the most headroom.

### 4.1 You only capture disagreements → label bias — P1, M
Ground truth comes solely from disputes (`/corrections`). That's a biased sample: you learn almost
nothing from the verdicts users were happy with. Add a lightweight **confirmation** path on
`VerdictScreen` ("Looks right" 👍) that records a positive label. Now the JSONL has both classes and
becomes usable for real eval/fine-tuning, not just error mining.

### 4.2 No prompt versioning tied to results — P1, M
Prompts live as files (`docs/prompts/...`) but a `check` row doesn't record **which prompt version**
produced it. So when you improve a prompt you can't measure lift against the old one. Store a prompt
hash/version on each `check` and in each export record. Cheap now, essential the moment you iterate.

### 4.3 Close the loop with an offline eval harness — P2, M
Right now the JSONL just lands in R2. Add a job that replays the labeled set against the current
prompts and reports accuracy per category/check. Without this, "self-learning" is data collection,
not improvement. This is the piece that turns the flywheel.

### 4.4 Per-check calibration — P2, L
The verdict thresholds (80/50, `fake_bar`) are hand-set. Once you have enough labeled data, you can
fit per-category thresholds/weights from outcomes instead of guessing. Keep the deterministic engine
(it's auditable) but let the data choose its constants.

---

## 5. Product / feature opportunities (viral & monetization)

| Idea | Why | Priority |
|---|---|---|
| **Shareable verdict card** (export a clean image of the result + confidence ring) | Built-in viral loop for a check-and-show-off product; near-zero marginal cost. | P1, M |
| **Re-enable / surface the required-step gate** | Verdicts can currently be produced from one photo (gate is bypassed in `VerdictEngine`). At minimum show a "low coverage — add more photos for a confident verdict" banner to protect trust. | P1, S |
| **Show the reference image side-by-side** at the verdict | The `reference` bucket and `reference_image_url` exist but aren't surfaced; "here's what the real one looks like" builds trust and shareability. | P2, M |
| **Freemium gate** | The premium model is your real cost. Free: N deep-checks/day or ID-only; Paid: unlimited / priority / multi-angle. The cost guardrails (`MaxAuthCallsPerScan`) already give you the lever. | P1, L |
| **Optional cloud backup of history** | Device-id-only means history dies on reinstall. Offer optional email/passkey backup without forcing accounts. | P2, L |
| **Graceful "unsupported category"** | The identify prompt happily IDs a lamp, but there are no steps for it → dead end. Detect out-of-scope categories and tell the user what's supported. | P1, S |
| **Push re-engagement** (`expo-notifications`) | "Your dispute helped improve the model" / new category launches. | P2, M |
| **Expand categories** | `NormalizeCategory` already degrades gracefully; electronics / designer apparel are natural next steps once the loop is proven. | P2, L |

---

## 7. Identification: multi-image capture & an honest confidence score

This is the right instinct. Today the flow is **one** photo → `POST /identify` → a confidence
number from a single Gemini call. Point-and-shoot is great UX, but a single frame can't justify a
high-confidence claim, and the model has no second angle to disambiguate (a clean replica looks
identical from one flattering angle). Two changes:

### 7.1 Discount single-image confidence — P1, S
Right now `/identify` surfaces the model's raw `confidence` verbatim. A model is happy to say "95%"
from one picture. Apply a **coverage-aware cap**: with one image, clamp displayed confidence (e.g.
to ≤70–75% or relabel it "Best guess"), and only allow the high band once corroborating angles
agree. This is a UI/scoring-policy change, not a model change, and it immediately makes the number
trustworthy. Pairs naturally with the verdict-engine calibration note (§4.4) and the coverage banner
(§5).

### 7.2 Let the user add angles, then re-identify — P1, M
On `IdentificationResultScreen`, add an **"Add another photo"** affordance and a **"Re-identify"**
submit button (your described design). Capture 1–4 frames, then send them together. Two ways to
implement, in order of preference:

- **Single multi-image call (preferred).** Gemini accepts **multiple images in one request** — put
  all angles in one `contents.parts` array and ask for a single consensus identification. This is
  *cheaper and better* than N separate calls: the model reasons across angles in one shot. Extend
  `IdentifyRequest` from `ImageKey` (string) to `ImageKeys` (string[]), and have
  `TieredVisionClient.IdentifyAsync` attach each image as an extra `inline_data` part (or, better,
  pass presigned GET URLs per §2.2).
- **Consensus over N calls (fallback).** If you'd rather keep calls independent, run each image and
  merge: agreement across angles raises confidence, disagreement lowers it and can flag "point at the
  label/logo for a better read."

### 7.3 Make confidence a function of agreement, not a single model's self-report — P2, M
Once you have multiple angles, confidence should reflect **how much the angles agree** (and, later,
how well the image matched a reference), not just one model's number. A simple rule — start from the
model's confidence, add for corroborating angles, subtract for contradictions or low-detail/blurry
frames (you already compute a blur proxy in `imagePipeline.ts`) — is enough to start, and it's the
same calibration philosophy as the verdict engine. Store the per-image scores so the learning loop
can later fit this properly.

### 7.4 Guide the extra shots — P2, S
Don't ask for "more photos" generically; ask for the angles that actually disambiguate (logo/label,
tag, a wide shot). Reuse the `auth_steps` instruction pattern so capture quality goes up and the
extra calls earn their cost.

**Net effect:** the same point-and-shoot first frame, an honest "best guess" confidence, and an
optional one-tap path to a stronger result — which also feeds richer multi-angle data into the
learning loop.

---

## 8. Vision-provider strategy: fallbacks, free tiers & backups

You already have the right seam for this — `IVisionClient` plus provider-swappable config
(`Vision:Premium:Provider/BaseUrl/Model`). Today, though, there's exactly **one** provider per tier
and **no fallback**: if Gemini or the premium endpoint returns 429/5xx, the check silently degrades
to "inconclusive" (and §3.3 notes there's no retry). For a paid, latency-sensitive, single-vendor
path, that's the biggest availability and cost risk.

### 8.1 Add an ordered provider chain with automatic failover — P1, M
Turn each tier into a **list** of providers tried in order: primary → backup → (optional) budget.
On 429/timeout/5xx, fall through to the next provider before giving up on the check. Because the
Tier-2 path is already an OpenAI-compatible shape, most providers drop in by changing only
`BaseUrl`/`Model`/key. This kills the single-vendor outage risk and lets you route by cost.

### 8.2 Provider menu (current, June 2026)

Pricing moves fast — verify before committing — but as of now:

| Tier | Use it for | Provider / model | Cost (approx, per 1M tokens) | Notes |
|---|---|---|---|---|
| **Free / dev** | Tier-1 ID, prototyping | **Gemini 3 Flash free tier** | $0 | ~10 RPM, 250K TPM, **1,500 req/day**, no card. Multimodal **included** — unusual vs OpenAI/Anthropic. Best free vision option. |
| **Free / backup** | Burst overflow, ID | **OpenRouter free models** (e.g. Llama 3.2 11B Vision) | $0 | 20–30+ free models, one key, no card. Subject to provider capacity — good as an overflow backup, not a sole primary. |
| **Cheap paid** | High-volume ID, cheap checks | **Groq — Llama 3.2 11B Vision** | ~$0.18 | Very low cost + very fast; great budget tier in the chain. 90B available for harder cases. |
| **Cheap paid** | Tier-1 at scale | **Gemini 3.1 Flash-Lite** | ~$0.25 in / $1.50 out | Cheapest Google paid tier; natural upgrade when you blow past free limits. |
| **Primary paid** | Tier-2 auth checks (accuracy matters) | **Gemini 3 Flash** (~$0.50/$3) or **GPT-4o-class** | varies | Keep your accuracy-critical tier on a strong model; let cheaper models be the fallback, not the default. |

**Lean recommendation:** Tier-1 (identification) on **Gemini free tier** while testing — it likely
covers your current volume at $0 — with **OpenRouter free** as automatic overflow. Tier-2 (the
authenticity verdict, where accuracy pays for itself) on your strong primary with **Groq Llama
Vision** as the cheap, fast fallback. That's a 3-deep chain that's mostly free until you have real
traffic, then degrades gracefully on cost rather than failing.

### 8.3 Provider-aware observability — P2, S
Once there are multiple providers, log which one served each call and its latency/cost, and emit a
PostHog/Serilog metric. You'll want to see fallback rates and per-provider accuracy (ties into the
prompt-versioning + eval work in §4.2–4.3).

### 8.4 Keep keys server-side & per-provider rate-limited — P1, S
A multi-provider chain multiplies the number of API keys. Keep them all server-side (they already
are), give each its own timeout/limit, and make sure a slow primary can't hold the request open past
your `ProcessingScreen` budget before the backup is tried.

---

## 9. User accounts & authentication

The app is intentionally account-free today (anonymous `device_id` in SecureStore). That's the right
call for first-run conversion and should **stay the default**. But device-id-only has real costs:
history dies on reinstall or new device, there's no cross-device sync, no way to reach users, and no
identity to hang monetization on. Add **optional** accounts without breaking the no-friction first run.

### 9.1 Anonymous-first, account-optional — P1, L
Keep launching straight into the camera. Offer sign-in only when it buys the user something — "save
your history," "sync across devices," "back up your scans." On sign-in, **link the existing
`device_id` to the new account** so nothing already scanned is lost (carry the local SQLite history
up to the server keyed by the new user id).

### 9.2 Providers: Google, Apple, Facebook, **and** email — P1, L
Offer all four as requested. Two hard requirements to bake in from the start:
- **Apple's App Store rule (Guideline 4.8):** if you offer any third-party/social login (Google or
  Facebook), you **must** also offer **Sign in with Apple** on iOS, or the app gets rejected. So
  Apple isn't optional once Google/Facebook are in.
- **Email/password** as the traditional fallback — include passwordless email **magic-link** as a
  lower-friction option; it sidesteps password storage entirely.

On the client, Expo covers all of this: `expo-auth-session` (Google/Facebook OAuth),
`expo-apple-authentication` (native Apple), and `expo-secure-store` (already in use) for tokens.

### 9.3 Buy auth, don't build it — P1, M (recommendation)
Per your lean/minimum-cost philosophy, use a **managed auth provider** rather than rolling your own
identity store, social-token exchange, and password resets. Evaluate (verify current free tiers
before choosing):
- **Supabase Auth** — social + email + magic links, generous free tier, Postgres-native (you're
  already on Postgres); arguably the leanest fit.
- **Firebase Auth** — battle-tested social login, strong Expo support, free tier.
- **Clerk** — best-in-class drop-in UI, pricier as you grow.
- **ASP.NET Core Identity + external providers** — the no-extra-vendor option that fits your .NET
  preference, but you own resets, verification, and token exchange. More control, more work.

The backend change is small and additive: validate the provider's token, resolve-or-create a `user`
row, link `device_id`, and add a **nullable** `user_id` to `scans`/`corrections`. Existing anonymous
endpoints keep working; authenticated requests just carry a bearer token alongside `X-Device-Id`.
This also unlocks per-user (not just per-device) rate limiting and the freemium gate in §5.

### 9.4 Privacy implications — P1, S
Accounts mean you now hold an email → your privacy policy and the "no personal information" claims in
`LegalController` must be updated (currently they promise no account/email). Account data also raises
the bar on the corrections dataset (SECURITY_REVIEW #5): keep training data keyed to anonymous ids,
not emails.

---

## 10. Further areas worth a look

- **Push notifications (`expo-notifications`)** — re-engagement, "your dispute improved the model,"
  new-category launches. Becomes far more useful once §9 gives you identities to target. _P2, M._
- **App-attest / Play Integrity** — once there's a paid path, verify requests come from your real
  app binary (not a script hitting the API) to protect vision spend. Stronger than the device-id
  header. _P2, M._
- **Cost dashboard / budget alerts** — with multiple paid providers (§8), track spend per provider
  per day and alert on anomalies before a bill surprises you. _P1, S._
- **A/B test prompts** — once §4.2 prompt-versioning lands, route a fraction of traffic to a
  candidate prompt and compare accuracy on the labeled set. The natural payoff of the learning loop.
  _P2, M._
- **Internationalization** — strings are inline in screens today; extract them before you localize.
  Authentication and resale markets are global. _P2, M._
- **Accessibility pass** — dynamic type, screen-reader labels on the camera/verdict UI, sufficient
  contrast on the confidence ring. Low cost, widens the audience, helps store ranking. _P2, S._
- **Referral / invite loop** — once accounts exist, "invite a friend, get N free deep-checks" turns
  the share card (§5) into actual growth. _P2, M._

---

## 11. Smaller polish (P2, batch when convenient)

- Remove leftover diagnostics before scaling: the `stage()` "TEMP diagnostic" wrapper in
  `upload.ts`, and the verbose env-key logging block in `Program.cs` (logs every env var name
  containing "Vision"/"Gemini" — names only, but noisy).
- `_deltest.tmp` (empty) and the `docs/WhatsApp Video ….mp4` are committed — prune from the repo.
- Mobile `version` is `0.1.0` in three places (`app.json`, `app.config.ts`, `package.json`);
  make sure your release process bumps them together (OTA `runtimeVersion` policy is `appVersion`).
- Add a couple of integration tests for the `/auth/analyze` orchestration (the verdict engine is
  well-tested in isolation, but the controller wiring isn't).
- Consider HSTS / HTTPS-redirect middleware for the public legal pages if they're ever served
  outside Railway's TLS termination.

---

## 12. Monetization & freemium model

A sketch, not a final plan — but it's grounded in your actual cost structure and the seams already
in the code. The guiding idea: **identification (especially of rare collectibles) is a value prop in
its own right, metered to drive sign-up; the authenticity verdict is the deeper paid value.**

### 12.1 What actually costs you money
- **Tier-1 identification (Gemini Flash):** ~$0, and free-tier-able (§8.2). Cheap, but **not
  unlimited on free** — identifying rare collectibles (with rarity + market value, §13) is itself a
  value prop people will pay for, so meter it at **10 identifications / day** on free. Still generous
  enough to be the viral hook; capped enough that power users (collectors, resellers) convert.
- **Tier-2 authenticity analysis:** the bigger cost. Up to `MaxAuthCallsPerScan` (8) premium calls
  per scan. This is the deeper paywall.
- **Storage/egress (R2):** small per scan; matters only at volume.

So you have **two** meters: a daily **identification** cap (cheap, drives accounts) and a monthly
**deep-check** cap (your real cost). You already have the throttles for both
(`MaxAuthCallsPerScan`, plus per-device/per-user rate limits once §9 lands).

### 12.2 Market anchor
Human-expert authentication is the comparison point and it's **not cheap or instant**: LegitApp runs
~$3–4 per sneaker check, CheckCheck sells credit packs (~$1.30–1.60 per check), both with turnaround
delays. Snap Check's edge is **instant + far cheaper**. That means you don't price against them —
you undercut massively and win on speed/convenience, reserving the $3–5 human price point for an
*optional escalation* (§12.5).

### 12.3 Proposed tiers

| | **Free** | **Plus** (~$4–6/mo or ~$30/yr) | **Pro / Pack** |
|---|---|---|---|
| Identify (point-and-shoot) | **10 / day** | Unlimited | Unlimited |
| Multi-image re-identify (§7) | ✅ (counts toward daily cap) | ✅ | ✅ |
| Rarity score (§13) | ✅ (the hook) | ✅ | ✅ |
| **Estimated market value** (§13) | range only / teaser | full estimate + price history | full + comps |
| **Deep authenticity checks** | **3–5 / month** | Unlimited (fair-use) | — |
| Pay-as-you-go check | — | — | e.g. **$0.99 each / 10 for $6** |
| History sync across devices (§9) | — | ✅ | ✅ |
| Priority / fastest model in the chain (§8) | standard | ✅ | ✅ |
| Shareable verdict card (§5) | with watermark | clean | clean |
| Reference-image comparison (§5) | — | ✅ | ✅ |

The free monthly allotment is the conversion lever: enough to prove value (and go viral), capped so
heavy users — resellers, your most valuable segment — convert. Resellers checking inventory daily
are exactly who'll happily pay a few dollars a month.

### 12.4 Where the paywalls sit (and what's already there)
Two meters, both enforced **server-side** against **`user_id` (preferred) or `device_id`** — the
same partition keys your rate limiter already uses, so the quota counters are the same shape. Never
trust the client.
- **Daily identification cap (10/day, free):** count at `POST /identify`. A fixed-window daily
  counter per device/user — structurally identical to the existing rate-limiter partitions.
- **Monthly deep-check cap (3–5/mo, free):** count at `POST /auth/analyze`. The check count is the
  natural meter.
- **Soft-gate the UI:** when a free user hits either cap, show an upgrade prompt instead of a hard
  error. Anonymous users get a "create an account for more" nudge — accounts (§9) *are* the upgrade
  path, and the 10/day identify cap is a gentle, daily reason to sign up rather than a one-time wall.

### 12.5 The high-margin upsell you already have
On an **Inconclusive** verdict the backend already returns `SuggestedVerificationServices` (StockX,
Entrupy, PSA…). That's a built-in **affiliate/referral** seam: when the AI can't be sure, hand off to
a paid human/grading service and take a referral cut. It monetizes exactly the cases where your AI
adds least value, and it's near-zero engineering — just wire affiliate links and track clicks.

### 12.6 Billing implementation (lean)
- **Use the app-store IAP/subscription rails** (`expo-in-app-purchases` / RevenueCat). On mobile you
  largely *must* — Apple/Google require IAP for digital goods, and RevenueCat abstracts both stores +
  gives you the subscription-state webhooks cheaply. Don't hand-roll billing.
- Backend stores entitlement (`free`/`plus`/`pro`) on the `user`/`device` row and checks it before
  `/auth/analyze`. RevenueCat webhook keeps it in sync. That's the whole integration.

### 12.7 Suggested rollout
1. **Now (testing):** everything free, but **instrument** — log **both** identify counts and
   deep-check counts per device so you can confirm the 10/day + 3–5/mo caps fit real usage rather
   than guessing. _(Two PostHog events; do this regardless of when you charge.)_
2. **With accounts (§9):** introduce the free monthly cap + the account upgrade nudge.
3. **Then:** turn on Plus subscription (RevenueCat) and the pay-as-you-go pack.
4. **Opportunistic:** affiliate hand-off on Inconclusive (§12.5) — can ship independently and early.

**Don't charge yet.** You're in testing; a paywall now suppresses the usage data you need. But build
the meter (step 1) immediately so the pricing decision later is evidence-based.

---

## 13. Rarity score & estimated market value (on any item)

This turns identification from a yes/no answer into something people *want* to do repeatedly — and
it's what makes the 10/day identify cap (§12) feel valuable rather than stingy. On **any** identified
item, show two new things alongside the name: a **rarity score** and an **estimated market value**.
This is the "what is this / is it special / what's it worth" loop that drives collectors, resellers,
and curious users — and it's highly shareable.

### 13.1 You're already 80% wired for this — P1, M
`TieredVisionClient.IdentifyAsync` already asks the model for `brand`, `model`, `year`, and
`retail_price`. Extend the same single call to also return a **rarity tier/score** and a **current
value estimate** — no new request, marginal cost. Extend `IdentificationResult` /
`IdentifyRequest`-side DTOs with:
- `rarity_score` (0–100) and/or `rarity_tier` (Common · Uncommon · Rare · Grail)
- `estimated_value_low` / `estimated_value_high` / `currency`
- `value_basis` (e.g. "model estimate" vs "live comps") + `as_of` date

Surface it on `IdentificationResultScreen` as a value chip + a rarity badge. The multi-image
re-identify (§7) tightens both numbers as angles confirm the exact variant (a colourway or a single
production year can swing value massively).

### 13.2 Don't let the model hallucinate prices — phase it — P1→P2
A vision model's freeform price guess is a liability if shown as fact. Phase the credibility up:
- **Phase 1 (now, lean):** model-estimated **range** with a visible **"estimate, not an appraisal"**
  disclaimer (mirror the verdict disclaimer pattern you already use). Good enough to ship and test
  demand.
- **Phase 2 (real comps):** back the number with actual market data per category. Candidate sources
  (verify current API access/terms before committing — several change or require partnership):
  - **Pokémon cards:** TCGplayer and/or PriceCharting have the most accessible pricing APIs.
  - **Sneakers:** StockX/GOAT have no open public API — use sold-comps (e.g. eBay's sold/Marketplace
    Insights data) or a licensed data partner.
  - **Watches:** Chrono24 is the reference market but has no public API — likely partnership or
    scraped-comp alternatives; treat as a later phase.
  - **Handbags:** resale platforms (Fashionphile, The RealReal) + eBay sold comps.
- Cache comps server-side per product so you're not hitting paid data APIs on every scan.

### 13.3 Rarity is where your data becomes a moat — P2, M
Start rarity from the model + known production facts (limited runs, special editions, year). But the
**proprietary** signal is your own scan stream: **how often the app sees an item is an inverse rarity
proxy.** Items you rarely see are genuinely rare; items you see constantly aren't. Aggregate scan
frequency per product (anonymous, you already store `scans.product_id`) and blend it into the rarity
score over time. No competitor without your install base can replicate that — it's a real data moat,
and it improves on its own as usage grows (the same flywheel as the learning loop in §4).

### 13.4 Monetization & trust hooks
- **Free shows the hook, Plus shows the depth:** rarity badge + a value *range* on free; full
  estimate, **price history/trend**, and comps behind Plus (§12.3). "What's it worth" is exactly the
  question collectors will subscribe for.
- **Affiliate tie-in (§12.5):** a real market value next to "sell on StockX / GOAT / TCGplayer" links
  is a natural, high-intent referral surface.
- **Not financial advice:** keep the same disclaimer discipline as the authenticity verdict —
  estimates are informational, values fluctuate, not an appraisal.

### 13.5 Watch-outs
- **Unsupported / generic items:** the identify prompt happily IDs a lamp (§5). For a random
  household object, rarity/value should gracefully say "no reliable market data" rather than invent a
  number.
- **Variant precision drives value:** the difference between a common and a grail is often one detail
  (a tag, a year, a colourway) — which is exactly why §7's multi-image path matters here, and a good
  reason to *prompt* for the disambiguating shot when an item looks potentially high-value.

---

## Priority summary

| P0 (before scaling users) | P1 (soon) | P2 (opportunistic) |
|---|---|---|
| Parallelize vision calls (2.1) | Idempotent analyze (3.1) | Constant-time token (1.2) |
| Ownership binding (1.1) | Request size limits (1.3) | Gemini key in header (1.4) |
| EF migrations (2.3) | Persistence-failure alerting (3.2) | Cache category steps (2.5) |
| | Vision retry/backoff (3.3) | Eval harness (4.3) |
| | Confirmation labels (4.1) | Calibration (4.4) |
| | Prompt versioning (4.2) | Reference image UI, push, categories |
| | Redis-backed limiter (2.4) | Repo cleanup, integration tests |
| | Verdict share card, freemium, coverage banner | Confidence-by-agreement (7.3), guided extra shots (7.4) |
| | **Discount single-image confidence (7.1)** | Provider observability (8.3) |
| | **Multi-image re-identify (7.2)** | App-attest, i18n, a11y, referrals (10) |
| | **Provider fallback chain (8.1)** + cheap/free backups (8.2) | |
| | **Optional accounts: Google/Apple/Facebook/email (9)** | |
| | Cost dashboard / budget alerts (10) | |
| | **Instrument identify + deep-check usage now (12.7 step 1)** | Affiliate hand-off on Inconclusive (12.5) |
| | **Rarity score + value estimate, model-based (13.1–13.2)** | Real market comps (13.2 ph.2), scan-frequency rarity moat (13.3) |
| | Daily identify cap meter (12.4) | |
| **Fix fake_bar product-slug mismatch (3.5)** | | |

Nothing here is a fire. The foundation is clean, layered, and resilient; this is the list that takes
it from "good testing build" to "ready to scale."
