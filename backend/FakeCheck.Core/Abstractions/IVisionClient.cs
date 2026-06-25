using FakeCheck.Core.Authentication;

namespace FakeCheck.Core.Abstractions;

/// <summary>Tier-1 identification result (spec §5.1).</summary>
public sealed record IdentificationResult(
    string Category,
    string Brand,
    string? ProductLine,
    string DisplayName,
    int Confidence,
    IReadOnlyList<IdentificationAlternative> Alternatives,
    string? Model,
    string? Year,
    string? RetailPrice);

public sealed record IdentificationAlternative(string ProductLine, string DisplayName, int Confidence);

/// <summary>Tier-2 single-check result parsed from the model JSON (spec §10.1).</summary>
public sealed record AuthCheckResult(
    int Score,
    CheckResult Result,
    string Observations,
    IReadOnlyList<string> RedFlags,
    bool HardFail,
    string RawJson);

/// <summary>Tiered vision abstraction (spec §17 Q1): cheap ID, premium auth checks.</summary>
public interface IVisionClient
{
    /// <summary>Tier 1 — identify the item from a single photo (Gemini Flash).</summary>
    Task<IdentificationResult> IdentifyAsync(string imageKey, CancellationToken ct = default);

    /// <summary>
    /// Tier 2 — run one authentication check using the step-specific system prompt
    /// (premium vision model). Must never throw on malformed model output; the
    /// implementation repairs once then downgrades to inconclusive (spec §10.1 resilience).
    /// </summary>
    Task<AuthCheckResult> RunCheckAsync(string checkId, string systemPrompt, string imageKey, CancellationToken ct = default);
}
