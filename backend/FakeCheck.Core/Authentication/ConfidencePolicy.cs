namespace FakeCheck.Core.Authentication;

/// <summary>How much to trust a displayed identification confidence (spec §2.2).</summary>
public enum ConfidenceBand
{
    /// <summary>Single image, or contradicting/blurry angles — show a hedged score.</summary>
    BestGuess,
    /// <summary>Two or more clear, agreeing angles — show the full score.</summary>
    Confident
}

/// <summary>The post-processed confidence shown to the user.</summary>
/// <param name="Score">Display confidence 0–100 after policy adjustment.</param>
/// <param name="Band">Honest band label for the score.</param>
/// <param name="Hint">Optional capture hint when quality is degraded (null when none).</param>
public readonly record struct ConfidenceDisplay(int Score, ConfidenceBand Band, string? Hint);

/// <summary>
/// Turns a raw model confidence into an honest, coverage-aware display confidence (spec §2.2).
/// Pure and unit-tested, like <see cref="VerdictEngine"/>. Tunable constants only; calibrate later.
/// </summary>
public static class ConfidencePolicy
{
    /// <summary>Single-image identification is hedged to at most this score.</summary>
    public const int SingleImageCap = 70;
    /// <summary>Added per corroborating extra angle when angles agree.</summary>
    public const int AnglePerImageBonus = 5;
    /// <summary>Subtracted when angles disagree on category/brand/line.</summary>
    public const int ContradictionPenalty = 20;
    /// <summary>Subtracted when any frame is flagged blurry.</summary>
    public const int BlurPenalty = 15;

    private const string ClearerShotHint = "Add a clearer shot of the label or logo.";

    /// <param name="rawModelConfidence">The model's self-reported confidence (clamped to 0–100).</param>
    /// <param name="imageCount">How many images informed this identification (≥ 1).</param>
    /// <param name="anglesAgree">Whether the angles agree on category + brand + line (only meaningful with ≥ 2).</param>
    /// <param name="anyBlurry">Whether any contributing frame was flagged blurry.</param>
    public static ConfidenceDisplay DisplayConfidence(
        int rawModelConfidence, int imageCount, bool anglesAgree, bool anyBlurry)
    {
        var score = Math.Clamp(rawModelConfidence, 0, 100);
        var images = Math.Max(1, imageCount);
        string? hint = null;

        // Corroboration: agreeing extra angles raise confidence; contradiction lowers it.
        if (images >= 2)
        {
            if (anglesAgree)
            {
                score += AnglePerImageBonus * (images - 1);
            }
            else
            {
                score -= ContradictionPenalty;
                hint = ClearerShotHint;
            }
        }

        // A blurry frame degrades confidence regardless of image count.
        if (anyBlurry)
        {
            score -= BlurPenalty;
            hint = ClearerShotHint;
        }

        score = Math.Clamp(score, 0, 100);

        // A single image can never be more than a "best guess".
        if (images <= 1)
        {
            return new ConfidenceDisplay(Math.Min(score, SingleImageCap), ConfidenceBand.BestGuess, hint);
        }

        var band = anglesAgree && !anyBlurry ? ConfidenceBand.Confident : ConfidenceBand.BestGuess;
        return new ConfidenceDisplay(score, band, hint);
    }
}
