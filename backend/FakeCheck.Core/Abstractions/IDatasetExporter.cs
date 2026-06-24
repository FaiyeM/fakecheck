namespace FakeCheck.Core.Abstractions;

/// <summary>Outcome of a learning-loop export run.</summary>
public sealed record ExportResult(string Key, int RecordCount);

/// <summary>
/// Exports confirmed user corrections as a labeled JSONL training dataset to object storage
/// (spec §8 / §10.3). Each record pairs the original AI analysis with the user's ground truth.
/// </summary>
public interface IDatasetExporter
{
    /// <summary>
    /// Export all corrections submitted at or after <paramref name="since"/> to a single
    /// JSONL object in the corrections bucket. Returns the object key and record count.
    /// </summary>
    Task<ExportResult> ExportCorrectionsAsync(DateTimeOffset since, CancellationToken ct = default);
}
