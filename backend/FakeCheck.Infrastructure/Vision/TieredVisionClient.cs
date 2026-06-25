using System.Text;
using System.Text.Json;
using Amazon.S3;
using FakeCheck.Core.Abstractions;
using FakeCheck.Core.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FakeCheck.Infrastructure.Vision;

/// <summary>
/// Tiered vision client (spec §17 Q1): Gemini Flash for cheap identification, a premium
/// vision model for the per-step authentication checks. All model output is parsed defensively —
/// one JSON-repair attempt, then a downgrade to <c>inconclusive</c>; the client never throws
/// on a bad model response (spec §10.1 resilience).
/// </summary>
public sealed class TieredVisionClient : IVisionClient
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IAmazonS3 _s3;
    private readonly R2Options _r2;
    private readonly VisionOptions _opts;
    private readonly ILogger<TieredVisionClient> _log;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public TieredVisionClient(
        IHttpClientFactory httpFactory,
        IAmazonS3 s3,
        IOptions<R2Options> r2,
        IOptions<VisionOptions> opts,
        ILogger<TieredVisionClient> log)
    {
        _httpFactory = httpFactory;
        _s3 = s3;
        _r2 = r2.Value;
        _opts = opts.Value;
        _log = log;
    }

    // ---- Tier 1: identification (Gemini Flash) ----

    public async Task<IdentificationResult> IdentifyAsync(string imageKey, CancellationToken ct = default)
    {
        var unknown = new IdentificationResult("unknown", "Unknown", null, "Unknown item", 0,
            Array.Empty<IdentificationAlternative>(), null, null, null);

        if (!_opts.Gemini.IsConfigured)
        {
            _log.LogWarning("Gemini not configured; returning unknown identification.");
            return unknown;
        }

        try
        {
            var b64 = await LoadBase64Async(imageKey, ct);
            var prompt =
                "Identify this item. It can be any category of object, collectible, or everyday item. " +
                "Determine the category, brand, model, release/manufacturing year, and original retail price if known. " +
                "Return ONLY strict JSON with the following schema: " +
                "{" +
                "\"category\":string," +
                "\"brand\":string," +
                "\"model\":string," +
                "\"year\":string_or_null," +
                "\"retail_price\":string_or_null," +
                "\"product_line\":string_or_null," +
                "\"display_name\":string," +
                "\"confidence\":0-100," +
                "\"alternatives\":[{\"product_line\":string,\"display_name\":string,\"confidence\":0-100}]" +
                "}";

            var body = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt },
                            new { inline_data = new { mime_type = "image/jpeg", data = b64 } }
                        }
                    }
                },
                generationConfig = new { temperature = 0.1, responseMimeType = "application/json" }
            };

            using var http = _httpFactory.CreateClient(nameof(TieredVisionClient));
            http.Timeout = TimeSpan.FromSeconds(_opts.TimeoutSeconds);
            var url = $"{_opts.Gemini.BaseUrl}/models/{_opts.Gemini.Model}:generateContent?key={_opts.Gemini.ApiKey}";
            using var resp = await http.PostAsync(url,
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);
            resp.EnsureSuccessStatusCode();

            var payload = await resp.Content.ReadAsStringAsync(ct);
            var text = ExtractGeminiText(payload);
            var json = ParseJsonObject(text);
            if (json is null) return unknown;

            var alts = new List<IdentificationAlternative>();
            if (json.Value.TryGetProperty("alternatives", out var altArr) && altArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var a in altArr.EnumerateArray())
                {
                    alts.Add(new IdentificationAlternative(
                         GetString(a, "product_line"), GetString(a, "display_name"), GetInt(a, "confidence")));
                }
            }

            return new IdentificationResult(
                Category: GetString(json.Value, "category", "unknown"),
                Brand: GetString(json.Value, "brand", "Unknown"),
                ProductLine: GetNullableString(json.Value, "product_line"),
                DisplayName: GetString(json.Value, "display_name", "Unknown item"),
                Confidence: GetInt(json.Value, "confidence"),
                Alternatives: alts,
                Model: GetNullableString(json.Value, "model"),
                Year: GetNullableString(json.Value, "year"),
                RetailPrice: GetNullableString(json.Value, "retail_price"));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Identification failed for {Key}; returning unknown.", imageKey);
            return unknown;
        }
    }

    // ---- Tier 2: authentication check (premium model) ----

    public async Task<AuthCheckResult> RunCheckAsync(string checkId, string systemPrompt, string imageKey, CancellationToken ct = default)
    {
        var inconclusive = new AuthCheckResult(0, CheckResult.Inconclusive,
            "Check could not be completed.", Array.Empty<string>(), false, "{}");

        if (!_opts.Premium.IsConfigured)
        {
            _log.LogWarning("Premium vision not configured; check {CheckId} downgraded to inconclusive.", checkId);
            return inconclusive;
        }

        try
        {
            var b64 = await LoadBase64Async(imageKey, ct);
            var raw = await CallPremiumAsync(systemPrompt, b64, ct);
            return ParseCheck(raw) ?? RepairOrInconclusive(raw, inconclusive);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Auth check {CheckId} failed for {Key}; downgrading to inconclusive.", checkId, imageKey);
            return inconclusive;
        }
    }

    private async Task<string> CallPremiumAsync(string systemPrompt, string b64, CancellationToken ct)
    {
        using var http = _httpFactory.CreateClient(nameof(TieredVisionClient));
        http.Timeout = TimeSpan.FromSeconds(_opts.TimeoutSeconds);

        // OpenAI-compatible chat/completions with an inline base64 image. Anthropic/Gemini Pro
        // use the same shape behind compatible gateways; swap BaseUrl/Model via config.
        var instruction = systemPrompt +
            "\n\nReturn ONLY strict JSON: {\"score\":0-100,\"result\":\"pass|fail|inconclusive\"," +
            "\"observations\":string,\"red_flags\":[string],\"hard_fail\":true|false}";

        var body = new
        {
            model = _opts.Premium.Model,
            temperature = 0.1,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = "You are an expert authenticator. Respond with strict JSON only." },
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = instruction },
                        new { type = "image_url", image_url = new { url = $"data:image/jpeg;base64,{b64}" } }
                    }
                }
            }
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{_opts.Premium.BaseUrl}/chat/completions");
        req.Headers.Add("Authorization", $"Bearer {_opts.Premium.ApiKey}");
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var resp = await http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var payload = await resp.Content.ReadAsStringAsync(ct);
        return ExtractOpenAiContent(payload);
    }

    private AuthCheckResult? ParseCheck(string text)
    {
        var json = ParseJsonObject(text);
        if (json is null) return null;

        var result = GetString(json.Value, "result", "inconclusive").ToLowerInvariant() switch
        {
            "pass" => CheckResult.Pass,
            "fail" => CheckResult.Fail,
            _ => CheckResult.Inconclusive
        };

        var flags = new List<string>();
        if (json.Value.TryGetProperty("red_flags", out var rf) && rf.ValueKind == JsonValueKind.Array)
            foreach (var f in rf.EnumerateArray())
                if (f.ValueKind == JsonValueKind.String) flags.Add(f.GetString()!);

        var hardFail = json.Value.TryGetProperty("hard_fail", out var hf) &&
                       (hf.ValueKind == JsonValueKind.True ||
                        (hf.ValueKind == JsonValueKind.String && bool.TryParse(hf.GetString(), out var b) && b));

        return new AuthCheckResult(
            Score: Math.Clamp(GetInt(json.Value, "score"), 0, 100),
            Result: result,
            Observations: GetString(json.Value, "observations"),
            RedFlags: flags,
            HardFail: hardFail && result == CheckResult.Fail,
            RawJson: text);
    }

    private AuthCheckResult RepairOrInconclusive(string raw, AuthCheckResult fallback)
    {
        // Repair attempt: pull the first {...} block out of a chatty response and re-parse once.
        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            var slice = raw.Substring(start, end - start + 1);
            var parsed = ParseCheck(slice);
            if (parsed is not null) return parsed;
        }
        _log.LogWarning("Model output could not be parsed or repaired; using inconclusive.");
        return fallback with { RawJson = raw };
    }

    // ---- helpers ----

    private async Task<string> LoadBase64Async(string imageKey, CancellationToken ct)
    {
        using var obj = await _s3.GetObjectAsync(_r2.BucketScans, imageKey, ct);
        await using var stream = obj.ResponseStream;
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        return Convert.ToBase64String(ms.ToArray());
    }

    private static JsonElement? ParseJsonObject(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        try
        {
            using var doc = JsonDocument.Parse(text);
            return doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string ExtractGeminiText(string payload)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            return doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text").GetString() ?? "";
        }
        catch { return ""; }
    }

    private static string ExtractOpenAiContent(string payload)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content").GetString() ?? "";
        }
        catch { return ""; }
    }

    private static string GetString(JsonElement e, string name, string fallback = "")
        => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? fallback : fallback;

    private static string? GetNullableString(JsonElement e, string name)
        => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static int GetInt(JsonElement e, string name)
    {
        if (!e.TryGetProperty(name, out var v)) return 0;
        return v.ValueKind switch
        {
            JsonValueKind.Number => v.TryGetInt32(out var i) ? i : (int)Math.Round(v.GetDouble()),
            JsonValueKind.String => int.TryParse(v.GetString(), out var s) ? s : 0,
            _ => 0
        };
    }
}
