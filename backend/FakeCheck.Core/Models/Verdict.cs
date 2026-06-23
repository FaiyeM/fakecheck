namespace FakeCheck.Core.Models;

public class Verdict
{
    public long Id { get; set; }
    public Guid ScanId { get; set; }
    public string Result { get; set; } = "inconclusive"; // authentic | counterfeit | inconclusive
    public double OverallConfidence { get; set; }
    public bool HardFailTriggered { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
