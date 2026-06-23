namespace FakeCheck.Core.Models;

/// <summary>Persisted result of a single Tier-2 authentication check (spec §7.1, §10.3).</summary>
public class Check
{
    public long Id { get; set; }
    public Guid ScanId { get; set; }
    public string CheckId { get; set; } = default!;
    public int Score { get; set; }
    public string Result { get; set; } = "inconclusive";
    public string Observation { get; set; } = "";

    /// <summary>Raw model JSON retained for fine-tuning comparison (spec §8.2, §10.3).</summary>
    public string? RawModelJson { get; set; }
}
