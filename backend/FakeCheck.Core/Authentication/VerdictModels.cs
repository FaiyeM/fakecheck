namespace FakeCheck.Core.Authentication;

/// <summary>
/// A single completed authentication check fed into the verdict engine.
/// Mirrors a row of the <c>checks</c> table (spec §7.1).
/// </summary>
/// <param name="CheckId">Stable id of the check, e.g. <c>date_code</c>.</param>
/// <param name="Score">Model score 0–100.</param>
/// <param name="Weight">Importance weight: 1 supporting, 2 strong, 3 critical (spec §7.1).</param>
/// <param name="Result">Pass / Fail / Inconclusive.</param>
/// <param name="IsCritical">True if this check can trigger a hard-fail override (spec §7.3).</param>
/// <param name="HardFail">True if this critical check failed definitively (e.g. wrong LV date-code format).</param>
/// <param name="Observation">One-line human-readable finding.</param>
public sealed record CheckInput(
    string CheckId,
    int Score,
    int Weight,
    CheckResult Result,
    bool IsCritical = false,
    bool HardFail = false,
    string Observation = "");

/// <summary>Required/optional step gating input (spec §4.4, §13).</summary>
/// <param name="StepId">Step id, e.g. <c>stitching</c>.</param>
/// <param name="Required">Whether a verdict is blocked without this photo.</param>
/// <param name="HasPhoto">Whether the user actually supplied a photo for this step.</param>
public sealed record StepStatus(string StepId, bool Required, bool HasPhoto);

/// <summary>Full input to <see cref="VerdictEngine"/>.</summary>
/// <param name="Category">Category slug, e.g. <c>sneaker</c> (drives suggested verification services).</param>
/// <param name="Checks">Completed checks.</param>
/// <param name="Steps">Step gating status.</param>
/// <param name="FakeBar">
/// Per-product additive bump to the Authentic threshold for high-counterfeit products
/// (e.g. Yeezy/LV), from <c>products.fake_bar</c> (spec §7.2). 0 for normal items.
/// </param>
public sealed record VerdictInput(
    string Category,
    IReadOnlyList<CheckInput> Checks,
    IReadOnlyList<StepStatus> Steps,
    decimal FakeBar = 0m);

/// <summary>Output of <see cref="VerdictEngine"/>.</summary>
public sealed record VerdictResult(
    VerdictKind Verdict,
    double OverallConfidence,
    bool HardFailTriggered,
    bool CanProduceVerdict,
    IReadOnlyList<string> MissingRequiredSteps,
    IReadOnlyList<string> UncertainChecks,
    IReadOnlyList<string> SuggestedVerificationServices,
    string Disclaimer);
