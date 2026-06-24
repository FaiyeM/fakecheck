using FakeCheck.Core.Abstractions;
using FakeCheck.Core.Models;
using FakeCheck.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FakeCheck.Infrastructure.Repositories;

/// <summary>EF Core implementation of <see cref="IScanRepository"/>.</summary>
public sealed class ScanRepository : IScanRepository
{
    private readonly FakeCheckDbContext _db;

    public ScanRepository(FakeCheckDbContext db) => _db = db;

    public async Task<Scan> CreateScanAsync(Scan scan, CancellationToken ct = default)
    {
        _db.Scans.Add(scan);
        await _db.SaveChangesAsync(ct);
        return scan;
    }

    public Task<Scan?> GetScanAsync(Guid scanId, CancellationToken ct = default) =>
        _db.Scans
            .Include(s => s.Photos)
            .Include(s => s.Checks)
            .FirstOrDefaultAsync(s => s.Id == scanId, ct);

    public async Task<IReadOnlyList<AuthStep>> GetStepsAsync(string categoryId, CancellationToken ct = default) =>
        await _db.AuthSteps
            .Where(s => s.CategoryId == categoryId)
            .OrderBy(s => s.Ordinal)
            .AsNoTracking()
            .ToListAsync(ct);

    public Task<Product?> GetProductAsync(string productId, CancellationToken ct = default) =>
        _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId, ct);

    public async Task SaveChecksAsync(Guid scanId, IEnumerable<Check> checks, CancellationToken ct = default)
    {
        foreach (var c in checks)
        {
            c.ScanId = scanId;
            _db.Checks.Add(c);
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task SaveVerdictAsync(Verdict verdict, CancellationToken ct = default)
    {
        _db.Verdicts.Add(verdict);
        await _db.SaveChangesAsync(ct);
    }

    public async Task SaveCorrectionAsync(Correction correction, CancellationToken ct = default)
    {
        _db.Corrections.Add(correction);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Correction>> GetCorrectionsSinceAsync(DateTimeOffset since, CancellationToken ct = default) =>
        await _db.Corrections
            .Where(c => c.SubmittedAt >= since)
            .OrderBy(c => c.SubmittedAt)
            .AsNoTracking()
            .ToListAsync(ct);
}
