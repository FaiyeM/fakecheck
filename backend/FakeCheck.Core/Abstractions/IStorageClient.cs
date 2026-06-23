namespace FakeCheck.Core.Abstractions;

/// <summary>A presigned upload target (spec §5 storage / Phase 4).</summary>
public sealed record PresignedUpload(string Key, string Url);

/// <summary>Object storage abstraction over Cloudflare R2 (S3-compatible).</summary>
public interface IStorageClient
{
    /// <summary>Issue <paramref name="count"/> presigned PUT URLs for direct-to-R2 upload.</summary>
    Task<IReadOnlyList<PresignedUpload>> CreatePresignedUploadsAsync(int count, CancellationToken ct = default);

    /// <summary>Copy an object into the corrections bucket with EXIF/GPS stripped (spec §14).</summary>
    Task<string> CopyToCorrectionsStrippedAsync(string sourceKey, CancellationToken ct = default);
}
