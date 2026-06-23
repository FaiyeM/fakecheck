namespace FakeCheck.Core.Models;

public class Scan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DeviceId { get; set; } = default!;
    public string CategoryId { get; set; } = default!;
    public string? ProductId { get; set; }
    public DateTimeOffset? IdentifiedAt { get; set; }
    public string Status { get; set; } = "created";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ScanPhoto> Photos { get; set; } = new List<ScanPhoto>();
    public ICollection<Check> Checks { get; set; } = new List<Check>();
}
