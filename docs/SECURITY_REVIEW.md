# FakeCheck — Security Review (Phase 13)

_Date: 2026-06-24 · Scope: backend (ASP.NET Core) + mobile (Expo) · Reviewer: build agent_

This is the Phase-13 `security-review` pass required by the build instructions
(secrets handling, presigned-URL scope, rate limits, input validation, EXIF
stripping). It was performed by reading the source; it does **not** replace a
live pen-test against the staging deploy. **No high-severity findings.**

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Swagger UI enabled by default in production | Medium | **Resolved** (2026-06-24) — `Swagger:Enabled` now defaults `false`; dev still on |
| 2 | Rate limiter partitions by client-supplied `X-Device-Id` (spoofable) | Medium | **Resolved** (2026-06-24) — added chained per-IP `"vision"` limiter on `/identify` + `/auth/analyze` (20/min) |
| 3 | Presigned PUT has no upload size cap | Low–Medium | Accepted tradeoff — note |
| 4 | `/admin/export` returns raw exception detail to caller | Low | Accepted (token-gated, aids ops) |
| 5 | User free-text `explanation` exported to R2 dataset may contain PII | Low | Note for dataset handling |
| 6 | Original scans-bucket objects rely on a bucket lifecycle rule for 30-day deletion | Low | Operational — verify R2 lifecycle set |
| 7 | No auth on user endpoints (by design, anonymous device-id) | Info | Accepted per spec |

## What's already done well

- **Secrets are not tracked.** `secrets/.gitignore` ignores everything except
  `*.example`, README, and itself; `git ls-files secrets/` confirms no real
  `.env` is committed. DB credentials arrive via Railway's injected
  `DATABASE_URL`; vision/R2 keys via env. No secret values are logged (the R2
  startup diagnostic logs only host + bucket names + a configured bool).
- **EXIF/GPS stripping (spec §14).** `CopyToCorrectionsStrippedAsync`
  re-encodes the correction copy with ImageSharp and nulls `ExifProfile`,
  `IptcProfile`, and `XmpProfile`, so GPS and device metadata are removed before
  the image is retained for training.
- **Presigned-URL scope is tight.** Object keys are **server-generated**
  (`scans/yyyy/MM/dd/{guid}.jpg`), so a client cannot choose the path, overwrite
  arbitrary keys, or traverse buckets. `Verb` is PUT-only, `ContentType` is
  pinned to `image/jpeg`, TTL is bounded (`PresignTtlMinutes`), and `count` is
  clamped to ≤12 both at the validator and in the storage client.
- **Input validation** (FluentValidation, auto-validation on) covers every DTO:
  bounded string lengths, category/platform/verdict enums constrained to
  allow-lists, `explanation` 20–500 chars, supporting photos ≤3, image keys
  ≤512. This blocks oversized payloads and most injection-shaped input.
- **RFC-7807 ProblemDetails** + global exception handler — user endpoints don't
  leak stack traces.
- **Admin export is gated**: disabled entirely (`404`) when no token is set,
  `401` on mismatch, constant string comparison.

## Findings & recommendations

**1 — Swagger enabled in production (Medium).** `Program.cs` shows Swagger when
`Swagger:Enabled` defaults to **true**, so the full API schema is publicly
served in prod. It's not a direct vuln but hands an attacker a complete map of
the surface. _Recommend:_ default `Swagger:Enabled` to `false` and turn it on
only per-environment.

**2 — Rate limit keyed on a spoofable header (Medium).** The limiter partitions
on `X-Device-Id` (falling back to IP). A client can rotate that header to defeat
the 60/min cap, and the cost-bearing `/identify` and `/auth/analyze` endpoints
call paid vision models. _Recommend:_ add a second IP-based fixed-window limiter
(chained) for the vision endpoints so per-IP cost is bounded regardless of the
device header; consider a lower per-minute limit on `/auth/analyze`.

**3 — No size cap on presigned PUT (Low–Medium).** A simple presigned PUT can't
enforce a max object size, so a client with a valid URL could upload a very
large object (R2 storage/egress cost). _Recommend:_ either switch to a presigned
**POST policy** with `content-length-range`, or set an R2 bucket-level object-size
/ lifecycle guard. Acceptable to defer given the short TTL + JPEG content-type.

**4 — `/admin/export` echoes exception detail (Low).** The catch block returns
`ex.GetType().Name: ex.Message`. It's behind the admin token and intentionally
aids R2-config diagnosis, so low risk; just keep the token strong and rotate it.

**5 — Free-text explanation may carry PII (Low).** `explanation` is
user-volunteered (no PII required by the app), but free text and is written
verbatim into the R2 corrections JSONL used for training. _Recommend:_ treat the
corrections dataset bucket as sensitive (restricted access, no public read), and
consider a light PII scrub before fine-tuning.

**6 — 30-day deletion depends on a lifecycle rule (Low, operational).** Spec §14
promises 30-day photo deletion. The correction copy is EXIF-stripped but the
**original** objects in the scans bucket are not deleted in code — that must be
an R2 lifecycle rule. _Action for Faye:_ confirm a 30-day expiration lifecycle
rule exists on the scans bucket (and decide retention for corrections used in
training).

**7 — Anonymous user endpoints (Info).** No authn on identify/analyze/scans/
corrections — by design (device-id only, no accounts). Acceptable per spec; it's
the reason finding #2 matters for cost control.

## Verification still owed (needs SDK/network env — Faye)

- `dotnet test` green on CI (verdict-engine unit tests + any integration tests).
- E2E smoke against staging Railway: identify → analyze → correction.
- Live confirmation that uploaded scan objects expire per the R2 lifecycle rule.
