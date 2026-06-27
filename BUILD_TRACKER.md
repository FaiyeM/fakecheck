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
| F0 | Real EF migrations baseline | §0 | P0 | 🔶 | — | **Faye-only (2026-06-28):** sandbox has no .NET SDK + no Railway Postgres access, so the daily task cannot generate/verify migrations. Faye must run F0 locally. Unblocks F9b, F8b, F5, F3b, F9h. |
| F1 | Fix `fake_bar` product-slug mismatch | §1 / §3.5 | P0 | ⬜ | — | Pure resolver + tests; safe to do in-sandbox. High value, small. |
| F7 | Usage instrumentation (identify + deep-check events) | §7 | P1 | ⬜ | — | Client analytics only; safe. Do early — data informs §6 caps. |
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
| F8a | Capture confirmations (positive labels) | §8.1 | P1 | ⬜ | — | "Looks right" → corrections w/ confirmed direction. |
| F8b | Prompt versioning stamped on checks | §8.2 | P1 | ⬜ | F0 (new column) | Hash per prompt; persist + export. |
| F2r | Redis-backed rate limiter (multi-instance) | §2.4 | P1 | ⬜ | — | **Needs Faye:** Redis instance on Railway. |
| F5 | Optional user accounts (Google/Apple/Facebook/email) | §5 | P1 (L) | ⬜ | F0 | **Needs Faye:** managed-auth choice + project/keys; Apple 4.8. Large. |
| F6 | Freemium usage meters + RevenueCat entitlements | §6 | P1 | ⬜ | F5, F7 | **Needs Faye:** RevenueCat acct + store products. |
| F3b | Rarity moat rollup (`product_scan_stats`) | §3.4 | P2 | ⬜ | F0, F1 | Table + nightly job + blend. The data-moat piece. |
| F3c | Real market comps (per-category data sources) | §3.3 | P2 | ⬜ | F3a | **Needs Faye:** data-source API access/terms. |
| F8c | Offline eval harness | §8.3 | P2 | ⬜ | F8a/F8b | Replays JSONL vs prompts; reports accuracy. |
| F9h | Persist `scan_photos` server-side | §3.4(rel) | P2 | ⬜ | F0 | Enables retention + ownership. |
| F10 | Growth/polish (share card, coverage banner, reference image, affiliate, push, integrity, i18n, a11y, repo cleanup) | §10 | P2 | ⬜ | — | Multiple small items; split as picked up. |

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
