// Cross-check of FakeCheck.Core VerdictEngine math (spec §7).
// The sandbox has no .NET SDK, so this Node port reproduces the engine's
// arithmetic and runs the same boundary cases as VerdictEngineTests.cs to
// verify thresholds, the weighted average, hard-fail override, the per-product
// elevated bar, and the required-step gate. Run: `node verify_verdict_math.mjs`.

const AUTH_BASE = 80.0;
const INCONCLUSIVE_LOW = 50.0;

function evaluate({ checks = [], steps = [], fakeBar = 0, category = "sneaker" }) {
  const missingRequired = steps.filter(s => s.required && !s.hasPhoto).map(s => s.stepId);
  if (missingRequired.length > 0) {
    return { verdict: "Inconclusive", confidence: 0, hardFail: false, canVerdict: false, missingRequired };
  }
  const uncertain = checks.filter(c => c.result === "Inconclusive").map(c => c.checkId);
  const hardFail = checks.some(c => c.isCritical && c.hardFail && c.result === "Fail");
  const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
  const avg = totalWeight > 0
    ? checks.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight
    : 0;

  if (hardFail) {
    return { verdict: "Counterfeit", confidence: avg, hardFail: true, canVerdict: true, missingRequired: [], uncertain };
  }
  if (totalWeight === 0) {
    return { verdict: "Inconclusive", confidence: 0, hardFail: false, canVerdict: true, missingRequired: [], uncertain };
  }
  const authThreshold = AUTH_BASE + fakeBar;
  let verdict;
  if (avg >= authThreshold) verdict = "Authentic";
  else if (avg >= INCONCLUSIVE_LOW) verdict = "Inconclusive";
  else verdict = "Counterfeit";
  return { verdict, confidence: avg, hardFail: false, canVerdict: true, missingRequired: [], uncertain };
}

// ---- assertions ----
let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}
function near(a, b) { return Math.abs(a - b) < 1e-9; }

const c = (score, weight, result = "Pass", extra = {}) =>
  ({ checkId: `c${score}_${weight}`, score, weight, result, isCritical: false, hardFail: false, ...extra });

// weighted average
let r = evaluate({ checks: [c(90, 3), c(60, 1)] });
check("weighted avg 330/4 = 82.5", near(r.confidence, 82.5));
check("82.5 => Authentic", r.verdict === "Authentic");

// threshold boundaries
const boundary = [
  [80, "Authentic"], [79, "Inconclusive"], [50, "Inconclusive"],
  [49, "Counterfeit"], [100, "Authentic"], [0, "Counterfeit"],
];
for (const [score, expected] of boundary) {
  r = evaluate({ checks: [c(score, 1)] });
  check(`score ${score} => ${expected}`, r.verdict === expected && near(r.confidence, score) && r.canVerdict && !r.hardFail);
}

// elevated fake bar
check("82 @ base => Authentic", evaluate({ checks: [c(82, 1)] }).verdict === "Authentic");
check("82 @ +5 bar => Inconclusive", evaluate({ checks: [c(82, 1)], fakeBar: 5 }).verdict === "Inconclusive");
check("95 @ +10 bar => Authentic", evaluate({ checks: [c(95, 1)], fakeBar: 10 }).verdict === "Authentic");

// hard-fail override
r = evaluate({ checks: [
  c(10, 3, "Fail", { checkId: "date_code", isCritical: true, hardFail: true }),
  c(100, 1), c(100, 1),
], category: "handbag" });
check("hard fail => Counterfeit", r.verdict === "Counterfeit");
check("hard fail flag set", r.hardFail === true && r.canVerdict);

// critical but not hard-failed
r = evaluate({ checks: [
  c(90, 3, "Pass", { checkId: "date_code", isCritical: true, hardFail: false }), c(90, 1),
] });
check("critical no-hardfail => Authentic", r.verdict === "Authentic" && !r.hardFail);

// required-step gate
r = evaluate({ checks: [c(95, 1)], steps: [
  { stepId: "box_label", required: true, hasPhoto: true },
  { stepId: "sole", required: true, hasPhoto: false },
  { stepId: "insole", required: false, hasPhoto: false },
] });
check("missing required blocks verdict", r.canVerdict === false && r.verdict === "Inconclusive");
check("missing list = [sole]", r.missingRequired.length === 1 && r.missingRequired[0] === "sole");

r = evaluate({ checks: [c(95, 1)], steps: [
  { stepId: "box_label", required: true, hasPhoto: true },
  { stepId: "sole", required: true, hasPhoto: true },
] });
check("all required present allows verdict", r.canVerdict === true && r.verdict === "Authentic");

// inconclusive uncertain list
r = evaluate({ checks: [
  c(60, 2, "Inconclusive", { checkId: "holo" }), c(65, 1, "Pass", { checkId: "edge" }),
], category: "pokemon" });
check("uncertain list contains holo", r.uncertain.includes("holo"));

console.log(`\nVerdict-engine math check: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
