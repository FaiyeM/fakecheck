namespace FakeCheck.Core.Models;

/// <summary>User dispute payload — exactly the schema in spec §9.3.</summary>
public class Correction
{
    public long Id { get; set; }
    public Guid ScanId { get; set; }
    public string UserCorrection { get; set; } = default!; // authentic | counterfeit | unknown
    public string Explanation { get; set; } = default!;    // 20–500 chars
    public List<string> SupportingImageUrls { get; set; } = new();
    public string OriginalVerdict { get; set; } = default!;
    public double OriginalConfidence { get; set; }
    public string ItemCategory { get; set; } = default!;
    public string? ProductId { get; set; }
    /// <summary>jsonb — the original per-check analysis at dispute time.</summary>
    public string OriginalChecks { get; set; } = "[]";
    public List<string> AllScanImageUrls { get; set; } = new();
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
    public string AppVersion { get; set; } = default!;
    public string Platform { get; set; } = default!; // ios | android
}
