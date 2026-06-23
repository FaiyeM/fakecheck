using Amazon.S3;
using Amazon.S3.Model;
using FakeCheck.Core.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace FakeCheck.Infrastructure.Storage;

/// <summary>
/// Cloudflare R2 (S3-compatible) implementation of <see cref="IStorageClient"/>.
/// Presigned PUT keeps large image bytes off the API server (spec Phase 4); the
/// corrections copy is re-encoded with ImageSharp, which drops all EXIF incl. GPS (spec §14).
/// </summary>
public sealed class R2StorageClient : IStorageClient
{
    private readonly IAmazonS3 _s3;
    private readonly R2Options _opts;
    private readonly ILogger<R2StorageClient> _log;

    public R2StorageClient(IAmazonS3 s3, IOptions<R2Options> opts, ILogger<R2StorageClient> log)
    {
        _s3 = s3;
        _opts = opts.Value;
        _log = log;
    }

    public Task<IReadOnlyList<PresignedUpload>> CreatePresignedUploadsAsync(int count, CancellationToken ct = default)
    {
        if (count <= 0) count = 1;
        if (count > 12) count = 12; // cap auth photos per scan

        var result = new List<PresignedUpload>(count);
        var today = DateTime.UtcNow.ToString("yyyy/MM/dd");
        for (var i = 0; i < count; i++)
        {
            var key = $"scans/{today}/{Guid.NewGuid():N}.jpg";
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _opts.BucketScans,
                Key = key,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.AddMinutes(_opts.PresignTtlMinutes),
                ContentType = "image/jpeg"
            };
            result.Add(new PresignedUpload(key, _s3.GetPreSignedURL(request)));
        }
        return Task.FromResult<IReadOnlyList<PresignedUpload>>(result);
    }

    public async Task<string> CopyToCorrectionsStrippedAsync(string sourceKey, CancellationToken ct = default)
    {
        // Read the object from the scans bucket.
        using var src = await _s3.GetObjectAsync(_opts.BucketScans, sourceKey, ct);
        await using var raw = src.ResponseStream;

        // Re-encode as JPEG via ImageSharp — this strips EXIF (including GPS) entirely.
        using var image = await Image.LoadAsync(raw, ct);
        image.Metadata.ExifProfile = null;
        image.Metadata.IptcProfile = null;
        image.Metadata.XmpProfile = null;

        await using var clean = new MemoryStream();
        await image.SaveAsync(clean, new JpegEncoder { Quality = 90 }, ct);
        clean.Position = 0;

        var destKey = $"corrections/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid():N}.jpg";
        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _opts.BucketCorrections,
            Key = destKey,
            InputStream = clean,
            ContentType = "image/jpeg",
            DisablePayloadSigning = true // R2 compatibility
        }, ct);

        _log.LogInformation("Copied {Source} → corrections/{Dest} (EXIF stripped)", sourceKey, destKey);
        return destKey;
    }
}
