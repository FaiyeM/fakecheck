namespace FakeCheck.Core.Models;

public class AuditLog
{
    public long Id { get; set; }
    public Guid? ScanId { get; set; }
    public string Event { get; set; } = default!;
    public string Payload { get; set; } = "{}"; // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
