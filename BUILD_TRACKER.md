# Snap Check — Build Tracker (autonomous daily roadmap)

_Single source of truth for the recommendations build-out. Updated by the daily Cowork task and by Faye._
_Created: 28 June 2026 · Source of items: `IMPLEMENTATION_SPEC.md` + `RECOMMENDATIONS.md`._

> This file is **separate** from `PROGRESS.md` (which tracks the original app build phases, all done).
> This one tracks the post-launch improvement roadmap.

---

## How the daily task uses this file

A scheduled Cowork task runs **every evening (~19:00)** and does **one item per run** (to stay within
plan usage limits). Each run, in order:

1. **Obey the global rules first** — `CLAUDE.md` (Think before coding · Simplicity first · Surgical
   changes · Goal-driven) and the prime directive: **never assume — if a decision is needed, stop and
   ask (queue it here), do not guess.**
2. **Re-verify all previous work** before doing anything new (see _Verification gate_ below). If
   verification fails, the run's only job is to investigate/fix that — no new work.
3. **Pick the next eligible item**: highest priority, status ⬜, all dependencies ✅, not 🔶 blocked.
4. If the item is **ambiguous or needs something the task can't safely do** (a secret/API key, a 3rd-
   party account, a product decision) → mark it 🔶, add the question to _Open Questions_, and **stop**
   (do not implement). Otherwise implement it surgically, add/extend tests, run the full verification.
5. **Commit to `main` only if everything is green.** Update the item's status, append a _Daily Run Log_
   entry. If tests fail and can't be fixed quickly, leave it uncommitted, mark 🔄 with notes, log it.

**Status legend:** ⬜ todo · 🔄 in progress / partial · ✅ done & verified · 🔶 blocked — needs Faye ·
⏭️ deferred · ❌ won't do

---

## Verification gate (run EVERY time, before and after any change)

- [ ] `git status` clean to start (no stray uncommitted changes); abort and report if not.
- [ ] Backend: `cd backend && dotnet build -c Release` succeeds.
- [ ] Backend: `dotnet test -c Release` — all xUnit tests green (verdict engine + category norm + any new).
- [ ] Mobile: `cd mobile && npm ci && npm run lint && npm test -- --ci` green.
- [ ] Spot-check that items previously marked ✅ still behave as described (no regressions).
- [ ] If any tool is unavailable in the run environment (e.g. no .NET SDK, no DB access, no network to
      a provider) → **do not fake it**; record the limitation in the run log and, if it blocks the
      chosen item, mark the item 🔶 with the reason.

> Note: some items (migrations, anything needing the live DB, provider keys, or store/billing accounts)
> may be **impossible in the task's sandbox**. The task must detect this and queue it for Faye rather
> than partially/unsafely implementing.

---

## Master roadmap (work top-down; respect dependencies)

| ID | Item | Spec | Priority | Status | Depends on | Notes |
|---|---|---|---|---|---|---|
| F0 | Real EF migrations baseline | §0 | P0 | ✅ | — | **Done 2026-06-28 (Faye-run, local SDK):** `InitialCreate` migration + design-time factory added; verified live schema == migration (incl. defaults); live DB baselined via `__EFMigrationsHistory` insert (no data touched); `Program.cs` switched `GenerateCreateScript`→`MigrateAsync`. Build clean + 50 xUnit tests pass. Unblocks F9b, F8b, F5, F3b, F9h. Boot confirmed green on Railway (CI + deploy), data intact. |
| F1 | Fix `fake_bar` product-slug mismatch | §1 / §3.5 | P0 | 🔄 | — | **Implemented 2026-06-28 (interactive, awaiting Faye's local `dotnet test`).** Server-authoritative fix, no mobile/DTO change: new pure `FakeCheck.Core/Authentication/ProductResolver.cs` (normalised contains-match brand+line→slug) + `IScanRepository.GetProductsByCategoryAsync` (+ ScanRepository impl) + `AuthController.Analyze` falls back to the resolver when the free-text `ProductId` misses the slug PK. 6 new xUnit tests in `ProductResolverTests.cs`. **Can't build/test in sandbox (no .NET SDK) → Faye verifies + commits locally.** |
| F7 | Usage instrumentation (identify + deep-check events) | §7 | P1 | ✅ | — | **Done 2026-06-28 (Faye committed + pushed, builds green).** Added `identify_completed` event ({category,imageCount,confidence,band}) to analytics contract + `analytics.identifyCompleted()` facade; fired in `IdentificationResultScreen` after a successful identify. Deep-checks already covered by existing `verdict_received`. `imageCount=1`/`band=null` until §2 (multi-image + confidence band) lands. Mobile lint+typecheck+24 tests GREEN. |
| F9a | Parallelize vision calls in `/auth/analyze` | §9 | P0 | ⬜ | — | `SemaphoreSlim` + `Task.WhenAll`. Add/adjust tests. |
| F9b | Ownership binding (scan/image ↔ device/user) | §9 / §1.1 | P0 | ⬜ | F0 (scan_photos col) | May need scan_photos persisted first. |
| F9c | Idempotent analyze (no duplicate checks/verdicts) | §9 / §3.1 | P1 | ⬜ | — | Upsert by (scanId, checkId). |
| F9d | Request body size limit + presign size cap | §1.3 | P1 | ⬜ | — | Kestrel limit; R2 POST policy. |
| F9e | Constant-time admin token compare | §1.2 | P2 | ⬜ | — | `CryptographicOperations.FixedTimeEquals`. Trivial. |
| F9f | Gemini key in header not query string | §1.4 | P2 | ⬜ | — | Trivial. |
| F9g | Persistence-failure metric on analyze | §3.2 | P1 | ⬜ | — | Emit counter/log event. |
| F2 | Multi-image identification + confidence policy | §2 | P1 | ⬜ | — | Pure `ConfidencePolicy` + DTO array + RN UI. Medium. |
| F3a | Rarity score + value estimate (model-based) | §3.1–3.2 | P1 | ⬜ | F1 (product slug) | Extend identify prompt + DTO + UI. Disclaimer required. |
| F4 | Vision provider fallback chain + retry/backoff | §4 / §3.3 | P1 | ⬜ | — | **Needs Faye:** backup-provider keys (Groq/OpenRouter). Code can land behind config; keys 🔶. |
| F8a | Capture confirmations (positive labels) | §8.1 | P1 | 🔶 | — | "Looks right" → corrections w/ confirmed direction. **Blocked 2026-06-28:** needs Faye decision — backend `/corrections` requires `Explanation` ≥20 chars (`Validators.cs:60`) + NOT NULL col, so a one-tap 👍 has no reason. Plus: does 👍 record agreement on every verdict or only authentic? Both are training-data decisions. See Open Questions [F8a]. |
| F8b | Prompt versioning stamped on checks | §8.2 | P1 | ⬜ | F0 (new column) | Hash per prompt; persist + export. |
| F2r | Redis-backed rate limiter (multi-instance) | §2.4 | P1 | ⬜ | — | **Needs Faye:** Redis instance on Railway. |
| F5 | Optional user accounts (Google/Apple/Facebook/email) | §5 | P1 (L) | ⬜ | F0 | **Needs Faye:** managed-auth choice + project/keys; Apple 4.8. Large. |
| F6 | Freemium usage meters + RevenueCat entitlements | §6 | P1 | ⬜ | F5, F7 | **Needs Faye:** RevenueCat acct + store products. |
| F3b | Rarity moat rollup (`product_scan_stats`) | §3.4 | P2 | ⬜ | F0, F1 | Table + nightly job + blend. The data-moat piece. |
| F3c | Real market comps (per-category data sources) | §3.3 | P2 | ⬜ | F3a | **Needs Faye:** data-source API access/terms. |
| F8c | Offline eval harness | §8.3 | P2 | ⬜ | F8a/F8b | Replays JSONL vs prompts; reports accuracy. |
| F9h | Persist `scan_photos` server-side | §3.4(rel) | P2 | ⬜ | F0 | Enables retention + ownership. |
| F10 | Growth/polish (share card, coverage banner, reference image, affiliate, push, integrity, i18n, a11y, repo cleanup) | §10 | P2 | 🔄 | — | Multiple small items; split as picked up. **2026-06-28:** repo-hygiene sub-slice landed — removed the spec-flagged `stage()` TEMP diagnostic in `mobile/src/api/upload.ts` (inlined the 3 calls so `uploadImageAsync` mirrors `uploadImagesAsync`). Mobile tsc+lint+24 tests GREEN. **Remaining:** share card, coverage banner, reference image, affiliate, push, integrity, i18n, a11y, and the other hygiene items (`_deltest.tmp`, committed mp4, `Program.cs` env logging). |
| F11 | Security: bump `SixLabors.ImageSharp` off 3.1.5 (known vulns) | — | P1 | ⬜ | — | **Found 2026-06-28.** `FakeCheck.Infrastructure.csproj` pins 3.1.5 → CVEs GHSA-2cmq-823j-5qj8 (high) + GHSA-rxmq-m78w-7wmc (moderate). Used in `Storage/R2StorageClient.cs`. Bump to latest patched 3.1.x, verify the exact fixed version covers both advisories, run build+50 tests. Safe in-sandbox? No (.NET 10 SDK unavailable) → verify via CI. |

> When an item is picked up, the task may split it into sub-rows for clarity. Keep the table the
> authoritative status list.

---

## Open Questions (queue) — Faye to answer

_The daily task appends here whenever it must stop instead of assume. Faye answers inline; the task
reads answers next run and unblocks the item._

> _(none yet — first run will populate as it encounters decisions. Known likely ones below, pre-seeded
> so you can answer ahead of time and unblock faster.)_

- **[F0] Migrations environment.** Does the daily task's sandbox have the .NET SDK + access to the live
  Railway Postgres to generate/verify migrations? If not, F0 must be run by you locally. _Answer:_ ✅ **NO** (2026-06-28) — sandbox has neither. F0 is Faye-only; marked 🔶. Daily task will skip F0 and its dependents (F9b, F8b, F5, F3b, F9h) until Faye lands the migrations baseline locally.
- **[F4] Backup vision providers.** Which fallback providers do you want wired, and where will their API
  keys live (Railway env)? Suggested: OpenRouter (free overflow) + Groq (cheap). _Answer:_ ⬜
- **[F5] Auth provider.** Managed (Supabase Auth / Firebase / Clerk) or ASP.NET Core Identity? This
  decides the whole accounts track. _Answer:_ ⬜
- **[F6] Billing.** Confirm RevenueCat + the exact tier/pricing to encode (Plus price, free caps
  10/day identify + N/month deep-check). _Answer:_ ⬜
- **[F2r] Redis.** OK to add a Redis service on Railway for the distributed limiter/usage counters?
  _Answer:_ ⬜
- **[F8a-2026-06-28] Capture confirmations — how should a one-tap "Looks right 👍" be recorded?**
  Two decisions block a clean implementation:
  1. **Explanation requirement.** The corrections endpoint validates `Explanation` ≥20 chars
     (`backend/FakeCheck.Api/Validation/Validators.cs:60`) and the DB column is NOT NULL
     (`FakeCheckDbContext.cs:116`). A one-tap 👍 has no typed reason. Pick one:
     - **(a) Mobile-only:** send a canned explanation (e.g. `"User confirmed: verdict looks correct."`).
       No backend change, fully verifiable in-sandbox now — but injects synthetic text into the
       training `explanation` field.
     - **(b) Backend flag:** add an `isConfirmation` bool (or relax `MinimumLength` when the user agrees
       with the verdict) so confirmations carry no fake reason. Cleaner dataset, but a backend change —
       I can't `dotnet build/test` it in this sandbox (no .NET SDK), so it'd have to verify via CI.
  2. **Which verdicts get 👍?** Should "Looks right" appear on **every** verdict (so a 👍 on a
     COUNTERFEIT verdict records `userCorrection="fake"` = confirmed-counterfeit), or **only** on
     authentic / likely-authentic verdicts (`userCorrection="authentic"`, matching the spec's literal
     "positives enter the dataset")? This defines what "confirmation" means in the learning set.
  _Answer:_ ⬜
- **[SANDBOX-GIT-2026-06-28] The daily-task sandbox cannot commit.** The Cowork run environment
  mounts the repo with `unlink` disabled (same restriction that breaks `npm ci` on `node_modules`).
  Git can stage/read but cannot remove `.git/index.lock`, so **no run can `git commit` from the
  sandbox.** Today's F7 work is therefore verified-but-uncommitted in the working tree, and a stale
  `.git/index.lock` was left behind that I can't delete. **Faye, to land F7 and unblock future runs,
  run locally:**
  ```bash
  cd ~/Documents/Claude/Projects/flossin-Fakecheck
  rm -f .git/index.lock
  git add -A
  git commit -m "feat(F7): add identify_completed usage event + analytics facade"
  git push
  ```
  Then in BUILD_TRACKER set F7 ✅. **Open question:** can the daily task's mount be given write/unlink
  permission on `.git` (and ideally `node_modules`) so runs can commit autonomously? Until then, every
  run can only verify + edit files and must hand the commit to you. _Answer:_ ⬜
- **[STRAY-2026-06-28] Uncommitted CameraCapture change.** The working tree had an un-logged,
  uncommitted edit to `mobile/src/components/CameraCapture.tsx`: it adds `{ backgroundColor:
  palette.bg }` to the two camera-permission view states (no-permission and not-granted). `palette`
  is already imported, lint passes, all 24 mobile tests pass — so it's a valid, benign cosmetic fix.
  But it wasn't produced by a logged run, so I left it **uncommitted** rather than assume intent.
  **Commit it (as `fix(mobile): theme bg on camera permission states`) or discard it?** _Answer:_ ✅ Faye said commit it (2026-06-28). Committed.

---

## Daily Run Log

_Newest first. One short entry per run: date · verification result · item attempted · outcome · commit._

| Date | Verify | Item | Outcome | Commit |
|---|---|---|---|---|
| 2026-06-28 | interactive (Faye present); backend NOT run in sandbox (no .NET SDK) — **Faye to run `dotnet build/test` locally** before commit. | F1 | Implemented the `fake_bar` slug-resolution fix server-side (Faye asked to start P0s). New pure `ProductResolver` + `GetProductsByCategoryAsync` repo method + `AuthController` fallback + 6 xUnit tests. No mobile/DTO change needed (server resolves the free-text line). F1 → 🔄 pending Faye's local green + commit. | (pending Faye local verify) |
| 2026-06-28 | mobile tsc+lint+test GREEN (24/24, only pre-existing axios import warning); backend NOT run (no .NET SDK — confirmed `dot.net` install is proxy-blocked 403, so can't install). git tree carried prior run's uncommitted F8a tracker edit (expected per [SANDBOX-GIT]); no regressions. | F10 (repo-hygiene sub-slice) | All eligible P0/P1 items are backend (F1, F9a, F9b — unverifiable, no SDK) or blocked/need-Faye (F8a 🔶, F2 needs unbuilt backend `ConfidencePolicy`, F4/F2r/F5/F6 need accounts/keys). Per the tooling-gap gate, picked the highest-priority **verifiable + unambiguous** item: the F10 §10 repo-hygiene slice explicitly listing the `stage()` TEMP diagnostic for removal. Removed it surgically from `mobile/src/api/upload.ts` (inlined the 3 calls; no orphaned refs; behavior unchanged on happy path). Full mobile gate GREEN. F10 → 🔄 (one sub-slice done; rest remain). **Commit still blocked in sandbox** (unlink on `.git` disabled) — Faye to commit this change + tracker update. | none (commit handed to Faye) |
| 2026-06-28 | mobile lint+test GREEN (24/24, only pre-existing axios import warning); backend NOT run (no .NET SDK in sandbox — verify via CI). git clean at start; F7 confirmed committed (c954849). | F8a (queued) | All eligible P0 items (F1, F9a, F9b) are backend .NET work → can't `dotnet build/test` here, so per the tooling-gap gate picked the highest-priority **verifiable** item. Top P1 verifiable candidate is F8a. On inspection it needs a Faye decision (one-tap 👍 collides with the `Explanation`≥20 NOT-NULL rule, and the agreement-direction semantics are a training-data choice) → marked 🔶, queued [F8a-2026-06-28]. F2 (next P1) can't be sliced mobile-only either (depends on the not-yet-built backend `ConfidencePolicy`/multi-image API). No code changed beyond this tracker. **Commit still blocked in sandbox** (unlink on `.git` disabled) — Faye to commit this tracker update. | none (tracker only; commit handed to Faye) |
| 2026-06-28 | mobile lint+typecheck+test GREEN (24/24); backend NOT run (no .NET SDK in sandbox) | F7 | Implemented `identify_completed` usage event + `analytics.identifyCompleted()` facade; wired into `IdentificationResultScreen` after a successful identify (extended facade test). All P0 items are backend → unverifiable this run (no SDK), so picked the highest-priority client-only item per the tooling-gap gate rule. **Could NOT commit:** sandbox mount blocks `unlink` on `.git/index.lock` → git cannot write a commit here. Left changes verified-but-uncommitted in the working tree; main HEAD unchanged (6b0b56e). Queued [SANDBOX-GIT-2026-06-28] for Faye to land + to fix the run env. F7 → 🔄. | none (commit blocked) |
| 2026-06-28 | backend build clean + 50/50 xUnit GREEN (local SDK) | F0 | Adopted EF migrations on existing live DB: InitialCreate + design-time factory; schema verified == migration; live baselined (history insert, no data loss); Program.cs → MigrateAsync. F0 ✅. | 9795058 + (this) |
| 2026-06-28 | mobile lint+test GREEN (24/24) | STRAY-2026-06-28 | Faye approved the stray `CameraCapture.tsx` theme-bg fix; committed it. | (this) |
| 2026-06-28 | ⚠️ partial: mobile lint+test GREEN (24/24); backend NOT run (no .NET SDK in sandbox); git **not clean** at start | none (gate stop) | Working tree had stray uncommitted edit to `CameraCapture.tsx`. Per gate, did **not** start new work. Investigated it (valid cosmetic theme-bg fix, lint+tests green), left it **uncommitted**, queued question [STRAY-2026-06-28] for Faye. Committed the governance docs (tracker/spec/map/recs) which were untracked, plus this log. | c7efd1c |
| 2026-06-28 | n/a (setup) | Tracker created | Roadmap seeded from spec; task scheduled (evening daily) | — |

---

## Guardrails (the task must honor these every run)

- **Never assume — ask.** Any unresolved choice → 🔶 + Open Questions, then stop. Do not guess intent,
  architecture, or requirements.
- **Surgical changes only.** Touch only what the chosen item requires. No drive-by refactors,
  reformatting, or "improvements" to adjacent code. Remove only imports/vars your change orphaned.
- **Simplicity first.** Implement the simplest thing that satisfies the item's acceptance criteria.
- **Goal-driven + verified.** Define the item's success criteria from its spec section, write/extend a
  test that proves it, make it pass, then commit. No green tests ⇒ no commit.
- **One item per run** to respect plan usage limits. If an item is large, do a safe sub-slice and leave
  the rest ⬜/🔄 with notes.
- **Secrets/accounts are off-limits.** The task must never invent API keys, create third-party
  accounts, or set production secrets. Those are always 🔶 for Faye.
- **Always update this file** (status + run log) and commit it alongside the change.
