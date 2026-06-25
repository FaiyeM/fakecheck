namespace FakeCheck.Infrastructure;

/// <summary>Learning-loop export settings (spec §10.3). Bound from the <c>Export</c> config section.</summary>
public sealed class ExportOptions
{
    public const string Section = "Export";
    /// <summary>Run the in-process nightly export cron.</summary>
    public bool Enabled { get; set; } = true;
    /// <summary>UTC hour (0–23) the nightly export fires.</summary>
    public int RunHourUtc { get; set; } = 7;
    /// <summary>Shared secret for the manual <c>POST /admin/export</c> trigger (X-Admin-Token). Empty ⇒ endpoint disabled.</summary>
    public string AdminToken { get; set; } = "";
}

/// <summary>Cloudflare R2 settings (S3-compatible). Bound from the <c>R2</c> config section.</summary>
public sealed class R2Options
{
    public const string Section = "R2";
    public string AccountId { get; set; } = "";
    public string AccessKeyId { get; set; } = "";
    public string SecretAccessKey { get; set; } = "";
    /// <summary>e.g. https://&lt;accountid&gt;.r2.cloudflarestorage.com</summary>
    public string Endpoint { get; set; } = "";
    public string BucketScans { get; set; } = "fakecheck-scans";
    public string BucketCorrections { get; set; } = "fakecheck-corrections";
    public string BucketReference { get; set; } = "fakecheck-reference";
    /// <summary>Minutes a presigned PUT URL stays valid.</summary>
    public int PresignTtlMinutes { get; set; } = 15;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccessKeyId) &&
        !string.IsNullOrWhiteSpace(SecretAccessKey) &&
        !string.IsNullOrWhiteSpace(Endpoint);
}

/// <summary>Tiered vision settings (spec §17 Q1). Bound from the <c>Vision</c> config section.</summary>
public sealed class VisionOptions
{
    public const string Section = "Vision";
    public GeminiOptions Gemini { get; set; } = new();
    public PremiumVisionOptions Premium { get; set; } = new();
    /// <summary>Max Tier-2 auth-check calls per scan (cost guardrail, spec Phase 5).</summary>
    public int MaxAuthCallsPerScan { get; set; } = 8;
    /// <summary>Per-call timeout in seconds before falling back to inconclusive.</summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>Tier-1 identification model (Gemini Flash).</summary>
public sealed class GeminiOptions
{
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gemini-2.5-flash";
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}

/// <summary>Tier-2 premium auth-check model (OpenAI / Anthropic / Gemini Pro).</summary>
public sealed class PremiumVisionOptions
{
    /// <summary>One of: openai | anthropic | gemini.</summary>
    public string Provider { get; set; } = "openai";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gpt-4o";
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
