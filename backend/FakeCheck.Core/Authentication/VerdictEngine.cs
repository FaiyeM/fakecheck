namespace FakeCheck.Core.Authentication;

/// <summary>
/// Pure verdict logic (no I/O) implementing spec §7. Deterministic and fully unit-testable.
/// </summary>
public static class VerdictEngine
{
    /// <summary>Legal disclaimer attached to every verdict (spec §17 Q3).</summary>
    public const string Disclaimer = "This is an AI-assisted assessment, not a certified appraisal.";

    /// <summary>Base Authentic threshold (spec §7.2).</summary>
    public const double AuthenticBaseThreshold = 80.0;

    /// <summary>Lower bound of the Inconclusive band; below this is Counterfeit (spec §7.2).</summary>
    public const double InconclusiveLowerBound = 50.0;

    /// <summary>
    /// Evaluate a scan into a verdict per spec §7: required-step gate, hard-fail override,
    /// weighted average, thresholds, and per-product elevated bar.
    /// </summary>
    public static VerdictResult Evaluate(VerdictInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var disclaimer = Disclaimer;

        // 1) Required-step gate (spec §13): cannot produce a verdict until all required steps have photos.
        var missingRequired = (input.Steps ?? Array.Empty<StepStatus>())
            .Where(s => s.Required && !s.HasPhoto)
            .Select(s => s.StepId)
            .ToArray();

        if (missingRequired.Length > 0)
        {
            return new VerdictResult(
                Verdict: VerdictKind.Inconclusive,
                OverallConfidence: 0.0,
                HardFailTriggered: false,
                CanProduceVerdict: false,
                MissingRequiredSteps: missingRequired,
                UncertainChecks: Array.Empty<string>(),
                SuggestedVerificationServices: Array.Empty<string>(),
                Disclaimer: disclaimer);
        }

        var checks = input.Checks ?? Array.Empty<CheckInput>();
        var uncertain = checks
            .Where(c => c.Result == CheckResult.Inconclusive)
            .Select(c => c.CheckId)
            .ToArray();

        // 2) Hard-fail override (spec §7.3): a critical check that fails definitively => Counterfeit.
        var hardFail = checks.Any(c => c.IsCritical && c.HardFail && c.Result == CheckResult.Fail);

        // 3) Weighted average over completed checks: Σ(score × weight) / Σ(weight) (spec §7.1).
        var totalWeight = checks.Sum(c => c.Weight);
        double weightedAverage = totalWeight > 0
            ? checks.Sum(c => (double)c.Score * c.Weight) / totalWeight
            : 0.0;

        if (hardFail)
        {
            return new VerdictResult(
                Verdict: VerdictKind.Counterfeit,
                OverallConfidence: weightedAverage,
                HardFailTriggered: true,
                CanProduceVerdict: true,
                MissingRequiredSteps: Array.Empty<string>(),
                UncertainChecks: uncertain,
                SuggestedVerificationServices: Array.Empty<string>(),
                Disclaimer: disclaimer);
        }

        // With no scored checks we cannot make a determination.
        if (totalWeight == 0)
        {
            return new VerdictResult(
                Verdict: VerdictKind.Inconclusive,
                OverallConfidence: 0.0,
                HardFailTriggered: false,
                CanProduceVerdict: true,
                MissingRequiredSteps: Array.Empty<string>(),
                UncertainChecks: uncertain,
                SuggestedVerificationServices: VerificationServices.For(input.Category),
                Disclaimer: disclaimer);
        }

        // 4) Thresholds with per-product elevated Authentic bar (spec §7.2).
        var authenticThreshold = AuthenticBaseThreshold + (double)input.FakeBar;

        VerdictKind verdict;
        if (weightedAverage >= authenticThreshold)
        {
            verdict = VerdictKind.Authentic;
        }
        else if (weightedAverage >= InconclusiveLowerBound)
        {
            verdict = VerdictKind.Inconclusive;
        }
        else
        {
            verdict = VerdictKind.Counterfeit;
        }

        var services = verdict == VerdictKind.Inconclusive
            ? VerificationServices.For(input.Category)
            : Array.Empty<string>();

        return new VerdictResult(
            Verdict: verdict,
            OverallConfidence: weightedAverage,
            HardFailTriggered: false,
            CanProduceVerdict: true,
            MissingRequiredSteps: Array.Empty<string>(),
            UncertainChecks: uncertain,
            SuggestedVerificationServices: services,
            Disclaimer: disclaimer);
    }
}
