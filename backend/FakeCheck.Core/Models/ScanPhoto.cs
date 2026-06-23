namespace FakeCheck.Core.Models;

public class ScanPhoto
{
    public long Id { get; set; }
    public Guid ScanId { get; set; }
    /// <summary>Null for the initial identification photo.</summary>
    public int? StepId { get; set; }
    public string ImageUrl { get; set; } = default!;
    public double? BlurScore { get; set; }
}
