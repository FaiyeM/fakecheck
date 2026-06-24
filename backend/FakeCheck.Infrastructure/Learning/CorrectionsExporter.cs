using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using FakeCheck.Core.Abstractions;
using FakeCheck.Core.Models;
using Microsoft.Extensions.Logging;

namespace FakeCheck.Infrastructure.Learning;

/// <summary>
/// Builds a labeled JSONL dataset from confirmed user corrections and writes it to the
/// corrections R2 bucket (spec §8 / §10.3). Each line pairs the original AI verdict and
/// per-check analysis (<c>raw_model_json</c> retained, spec §8.2) with the user's ground truth.
/// </summary>
public sealed class CorrectionsExporter : IDatasetExporter
{
    private readonly IScanRepository _repo;
    private readonly IStorageClient _storage;
    private readonly ILogger<CorrectionsExporter> _log;

    public CorrectionsExporter(IScanRepository repo, IStorageClient storage, ILogger<CorrectionsExporter> log)
    {
        _repo = repo;
        _storage = storage;
        _log = log;
    }

    public async Task<ExportResult> ExportCorrectionsAsync(DateTimeOffset since, CancellationToken ct = default)
    {
        var corrections = await _repo.GetCorrectionsSinceAsync(since, ct);
        var key = $"datasets/corrections/{DateTime.UtcNow:yyyy/MM/dd}/corrections-{DateTime.UtcNow:yyyyMMddTHHmmssZ}.jsonl";

        var sb = new StringBuilder();
        foreach (var c in corrections)
        {
            sb.Append(ToJsonLine(c));
            sb.Append('\n');
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        await _storage.PutCorrectionsDatasetAsync(key, bytes, "application/x-ndjson", ct);

        _log.LogInformation("Exported {Count} corrections since {Since:o} → {Key}", corrections.Count, since, key);
        return new ExportResult(key, corrections.Count);
    }

    /// <summary>Serialize one correction as a single-line labeled training record.</summary>
    private static string ToJsonLine(Correction c)
    {
        var record = new JsonObject
        {
            ["scan_id"] = c.ScanId.ToString(),
            ["category"] = c.ItemCategory,
            ["product_id"] = c.ProductId,
            ["ai_verdict"] = c.OriginalVerdict,
            ["ai_confidence"] = c.OriginalConfidence,
            ["ground_truth"] = c.UserCorrection,            // authentic | counterfeit | unknown
            ["explanation"] = c.Explanation,
            ["original_checks"] = ParseOrRaw(c.OriginalChecks),
            ["scan_image_urls"] = ToJsonArray(c.AllScanImageUrls),
            ["supporting_image_urls"] = ToJsonArray(c.SupportingImageUrls),
            ["app_version"] = c.AppVersion,
            ["platform"] = c.Platform,
            ["submitted_at"] = c.SubmittedAt.ToString("o")
        };
        return record.ToJsonString();
    }

    /// <summary>Embed the stored jsonb checks as structured JSON; fall back to a string if unparseable.</summary>
    private static JsonNode? ParseOrRaw(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonNode.Parse(json); }
        catch (JsonException) { return JsonValue.Create(json); }
    }

    private static JsonArray ToJsonArray(IEnumerable<string> items)
    {
        var arr = new JsonArray();
        foreach (var i in items) arr.Add(i);
        return arr;
    }
}
