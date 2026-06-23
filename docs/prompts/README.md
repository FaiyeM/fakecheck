# FakeCheck Prompt Library

This is the **core IP** of FakeCheck (spec §17 Q2). One file per authentication check, version-controlled so prompt changes are reviewable and A/B-testable.

## Tiers (spec §17 Q1)

- **Tier 1 — Identification** (`identify.system.md`): cheap model (Gemini Flash). One photo in → `{category, brand, product_line, confidence, alternatives[]}`.
- **Tier 2 — Authentication checks** (per-category files): premium vision model, one call per step, each returning a strict JSON score object.

## Shared JSON contract for Tier-2 checks

Every authentication check MUST return exactly this JSON shape (the backend parses it, repairs malformed output once, and falls back to `inconclusive` on failure):

```json
{
  "score": 0,
  "result": "pass | fail | inconclusive",
  "observations": "one or two sentences describing what is visible",
  "red_flags": ["short phrases naming concrete problems, empty if none"],
  "hard_fail": false
}
```

- `score` — 0–100 confidence that this specific feature is authentic.
- `result` — `pass` ≥ 70, `inconclusive` 40–69, `fail` < 40 (the check's own band; the overall verdict is computed separately by the weighted engine, spec §7).
- `hard_fail` — set `true` ONLY for the documented definitive-counterfeit conditions (spec §7.3). When `true`, the verdict engine overrides to Counterfeit regardless of the average. Only critical checks may set this.

## Weights (spec §7.1)

Each file states its engine weight: **3** critical, **2** strong, **1** supporting. The backend seeds these into `auth_steps.weight`.

## Authoring rules

1. Always be specific about *what authentic looks like* and *what fakes get wrong* — pull from spec §6.1–§6.4.
2. Never claim certainty. Score conservatively; prefer `inconclusive` over a forced verdict (spec §13).
3. Never destroy or instruct destruction of the item (e.g. no rip tests on cards).
4. Downscale images to the model's optimal tile size before sending (spec §5 cost guardrail).
