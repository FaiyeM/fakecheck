using FakeCheck.Core.Authentication;
using Xunit;

namespace FakeCheck.Tests;

public class ConfidencePolicyTests
{
    [Fact] // Single image is always hedged: capped at 70 and labelled "Best guess".
    public void Single_image_is_capped_and_best_guess()
    {
        var r = ConfidencePolicy.DisplayConfidence(95, 1, anglesAgree: true, anyBlurry: false);
        Assert.Equal(70, r.Score);
        Assert.Equal(ConfidenceBand.BestGuess, r.Band);
        Assert.Null(r.Hint);
    }

    [Fact] // Single image below the cap keeps its score.
    public void Single_image_below_cap_unchanged()
    {
        var r = ConfidencePolicy.DisplayConfidence(50, 1, anglesAgree: false, anyBlurry: false);
        Assert.Equal(50, r.Score);
        Assert.Equal(ConfidenceBand.BestGuess, r.Band);
    }

    [Theory] // Each corroborating agreeing angle adds a small bonus; band becomes Confident.
    [InlineData(80, 2, 85)]
    [InlineData(80, 3, 90)]
    public void Agreeing_angles_add_bonus_and_become_confident(int raw, int count, int expected)
    {
        var r = ConfidencePolicy.DisplayConfidence(raw, count, anglesAgree: true, anyBlurry: false);
        Assert.Equal(expected, r.Score);
        Assert.Equal(ConfidenceBand.Confident, r.Band);
        Assert.Null(r.Hint);
    }

    [Fact] // Bonus cannot push the score over 100.
    public void Bonus_is_capped_at_100()
    {
        var r = ConfidencePolicy.DisplayConfidence(98, 4, anglesAgree: true, anyBlurry: false);
        Assert.Equal(100, r.Score);
        Assert.Equal(ConfidenceBand.Confident, r.Band);
    }

    [Fact] // Contradiction across angles subtracts, drops to Best guess, and surfaces a hint.
    public void Contradiction_penalised_and_hinted()
    {
        var r = ConfidencePolicy.DisplayConfidence(80, 2, anglesAgree: false, anyBlurry: false);
        Assert.Equal(60, r.Score);
        Assert.Equal(ConfidenceBand.BestGuess, r.Band);
        Assert.NotNull(r.Hint);
    }

    [Fact] // A blurry frame degrades confidence and keeps the band hedged even when angles agree.
    public void Blurry_frame_penalised_and_not_confident()
    {
        var r = ConfidencePolicy.DisplayConfidence(80, 2, anglesAgree: true, anyBlurry: true);
        Assert.Equal(70, r.Score); // 80 + 5 (agree bonus) - 15 (blur)
        Assert.Equal(ConfidenceBand.BestGuess, r.Band);
        Assert.NotNull(r.Hint);
    }

    [Fact] // A single blurry image is penalised, still capped, still Best guess.
    public void Single_blurry_image()
    {
        var r = ConfidencePolicy.DisplayConfidence(60, 1, anglesAgree: false, anyBlurry: true);
        Assert.Equal(45, r.Score);
        Assert.Equal(ConfidenceBand.BestGuess, r.Band);
        Assert.NotNull(r.Hint);
    }

    [Theory] // Raw confidence is clamped; imageCount < 1 is treated as a single image.
    [InlineData(150, 1, 70)]
    [InlineData(-10, 1, 0)]
    [InlineData(40, 0, 40)]
    public void Inputs_are_clamped(int raw, int count, int expected)
        => Assert.Equal(expected, ConfidencePolicy.DisplayConfidence(raw, count, false, false).Score);
}
