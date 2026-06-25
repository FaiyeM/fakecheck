using FakeCheck.Core.Authentication;
using Xunit;

namespace FakeCheck.Tests;

public class VerdictEngineTests
{
    private static CheckInput Check(int score, int weight, CheckResult result = CheckResult.Pass)
        => new($"c{score}_{weight}", score, weight, result);

    private static VerdictInput Input(
        IReadOnlyList<CheckInput> checks,
        decimal fakeBar = 0m,
        string category = "sneaker",
        IReadOnlyList<StepStatus>? steps = null)
        => new(category, checks, steps ?? Array.Empty<StepStatus>(), fakeBar);

    // ---- Weighted average + thresholds (spec §7.1, §7.2) ----

    [Fact]
    public void WeightedAverage_IsScoreTimesWeightOverWeight()
    {
        // (90*3 + 60*1) / (3+1) = 330/4 = 82.5
        var result = VerdictEngine.Evaluate(Input(new[]
        {
            Check(90, 3),
            Check(60, 1)
        }));

        Assert.Equal(82.5, result.OverallConfidence, 3);
        Assert.Equal(VerdictKind.Authentic, result.Verdict);
    }

    [Theory]
    // avg, expected verdict — boundaries of the 80 / 50 bands
    [InlineData(80, VerdictKind.Authentic)]      // exactly 80 => Authentic
    [InlineData(79, VerdictKind.Inconclusive)]   // just below 80
    [InlineData(50, VerdictKind.Inconclusive)]   // exactly 50 => Inconclusive
    [InlineData(49, VerdictKind.Counterfeit)]    // just below 50
    [InlineData(100, VerdictKind.Authentic)]
    [InlineData(0, VerdictKind.Counterfeit)]
    public void ThresholdBoundaries_MapToExpectedVerdict(int score, VerdictKind expected)
    {
        var result = VerdictEngine.Evaluate(Input(new[] { Check(score, 1) }));
        Assert.Equal(expected, result.Verdict);
        Assert.Equal(score, result.OverallConfidence, 3);
        Assert.True(result.CanProduceVerdict);
        Assert.False(result.HardFailTriggered);
    }

    // ---- Per-product elevated bar (spec §7.2) ----

    [Fact]
    public void ElevatedFakeBar_DemotesBorderlineAuthenticToInconclusive()
    {
        // Score 82 would be Authentic at the base bar, but a +5 fake bar raises the bar to 85.
        var baseline = VerdictEngine.Evaluate(Input(new[] { Check(82, 1) }));
        Assert.Equal(VerdictKind.Authentic, baseline.Verdict);

        var elevated = VerdictEngine.Evaluate(Input(new[] { Check(82, 1) }, fakeBar: 5m));
        Assert.Equal(VerdictKind.Inconclusive, elevated.Verdict);
        Assert.Equal(82, elevated.OverallConfidence, 3);
    }

    [Fact]
    public void ElevatedFakeBar_StillAuthenticWhenClearlyAboveRaisedBar()
    {
        var elevated = VerdictEngine.Evaluate(Input(new[] { Check(95, 1) }, fakeBar: 10m));
        Assert.Equal(VerdictKind.Authentic, elevated.Verdict);
    }

    // ---- Hard-fail override (spec §7.3) ----

    [Fact]
    public void HardFail_OverridesHighWeightedAverage()
    {
        var checks = new[]
        {
            new CheckInput("date_code", 10, 3, CheckResult.Fail, IsCritical: true, HardFail: true,
                Observation: "Date-code format invalid for stated era"),
            Check(100, 1),
            Check(100, 1)
        };

        var result = VerdictEngine.Evaluate(Input(checks, category: "handbag"));

        Assert.Equal(VerdictKind.Counterfeit, result.Verdict);
        Assert.True(result.HardFailTriggered);
        Assert.True(result.CanProduceVerdict);
    }

    [Fact]
    public void CriticalCheckThatDidNotHardFail_DoesNotOverride()
    {
        var checks = new[]
        {
            new CheckInput("date_code", 90, 3, CheckResult.Pass, IsCritical: true, HardFail: false),
            Check(90, 1)
        };

        var result = VerdictEngine.Evaluate(Input(checks));
        Assert.Equal(VerdictKind.Authentic, result.Verdict);
        Assert.False(result.HardFailTriggered);
    }

    // ---- Required-step gate (spec §13) ----

    [Fact]
    public void MissingRequiredStep_DoesNotBlockVerdict()
    {
        var steps = new[]
        {
            new StepStatus("box_label", Required: true, HasPhoto: true),
            new StepStatus("sole", Required: true, HasPhoto: false),
            new StepStatus("insole", Required: false, HasPhoto: false)
        };

        var result = VerdictEngine.Evaluate(Input(new[] { Check(95, 1) }, steps: steps));

        Assert.True(result.CanProduceVerdict);
        Assert.Equal(VerdictKind.Authentic, result.Verdict);
        Assert.Empty(result.MissingRequiredSteps);
    }

    [Fact]
    public void AllRequiredStepsPresent_AllowsVerdict()
    {
        var steps = new[]
        {
            new StepStatus("box_label", Required: true, HasPhoto: true),
            new StepStatus("sole", Required: true, HasPhoto: true)
        };

        var result = VerdictEngine.Evaluate(Input(new[] { Check(95, 1) }, steps: steps));
        Assert.True(result.CanProduceVerdict);
        Assert.Equal(VerdictKind.Authentic, result.Verdict);
    }

    // ---- Inconclusive output (spec §7.4) ----

    [Fact]
    public void Inconclusive_ListsUncertainChecksAndSuggestsServices()
    {
        var checks = new[]
        {
            new CheckInput("holo", 60, 2, CheckResult.Inconclusive),
            new CheckInput("edge", 65, 1, CheckResult.Pass)
        };

        var result = VerdictEngine.Evaluate(Input(checks, category: "pokemon"));

        Assert.Equal(VerdictKind.Inconclusive, result.Verdict);
        Assert.Contains("holo", result.UncertainChecks);
        Assert.NotEmpty(result.SuggestedVerificationServices);
    }

    [Fact]
    public void EveryVerdict_CarriesTheLegalDisclaimer()
    {
        var result = VerdictEngine.Evaluate(Input(new[] { Check(95, 1) }));
        Assert.Equal(VerdictEngine.Disclaimer, result.Disclaimer);
    }
}
