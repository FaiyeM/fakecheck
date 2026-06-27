using FakeCheck.Core.Models;

namespace FakeCheck.Core.Abstractions;

/// <summary>Persistence boundary for scans, checks, verdicts, and corrections.</summary>
public interface IScanRepository
{
    Task<Scan> CreateScanAsync(Scan scan, CancellationToken ct = default);
    Task<Scan?> GetScanAsync(Guid scanId, CancellationToken ct = default);
    Task<IReadOnlyList<AuthStep>> GetStepsAsync(string categoryId, CancellationToken ct = default);
    Task<Product?> GetProductAsync(string productId, CancellationToken ct = default);

    /// <summary>All seeded products for a category — candidates for free-text slug resolution (spec §1).</summary>
    Task<IReadOnlyList<Product>> GetProductsByCategoryAsync(string categoryId, CancellationToken ct = default);
    Task SaveChecksAsync(Guid scanId, IEnumerable<Check> checks, CancellationToken ct = default);
    Task SaveVerdictAsync(Verdict verdict, CancellationToken ct = default);
    Task SaveCorrectionAsync(Correction correction, CancellationToken ct = default);

    /// <summary>Corrections submitted at or after <paramref name="since"/>, oldest first (learning-loop export).</summary>
    Task<IReadOnlyList<Correction>> GetCorrectionsSinceAsync(DateTimeOffset since, CancellationToken ct = default);
}
