using Amazon.Runtime;
using Amazon.S3;
using FakeCheck.Core.Abstractions;
using FakeCheck.Infrastructure.Data;
using FakeCheck.Infrastructure.Learning;
using FakeCheck.Infrastructure.Repositories;
using FakeCheck.Infrastructure.Storage;
using FakeCheck.Infrastructure.Vision;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FakeCheck.Infrastructure;

/// <summary>Registers EF, R2 storage, the tiered vision client, and the scan repository.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddFakeCheckInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // EF Core / Postgres.
        // Priority: Railway's injected DATABASE_URL (postgres:// URI, auto-converted), else an
        // explicit ConnectionStrings__Default, else a local dev default. DATABASE_URL must take
        // precedence over the appsettings.json localhost default so the managed DB is actually used.
        var databaseUrl = ConvertDatabaseUrl(Environment.GetEnvironmentVariable("DATABASE_URL"));
        var configDefault = config.GetConnectionString("Default");
        var conn = databaseUrl
                   ?? configDefault
                   ?? "Host=localhost;Port=5432;Database=fakecheck;Username=postgres;Password=dev";

        // Startup diagnostic (no secrets): which source won and which host we'll dial.
        var dbSource = databaseUrl is not null ? "DATABASE_URL"
                     : configDefault is not null ? "ConnectionStrings:Default"
                     : "localhost-fallback";
        var dbHost = "unknown";
        try { dbHost = new Npgsql.NpgsqlConnectionStringBuilder(conn).Host ?? "unknown"; }
        catch { /* ignore parse issues, host stays "unknown" */ }
        Console.WriteLine($"[startup] EF Postgres source={dbSource} host={dbHost}");

        services.AddDbContext<FakeCheckDbContext>(o => o.UseNpgsql(conn));

        // Options
        services.Configure<R2Options>(config.GetSection(R2Options.Section));
        services.Configure<VisionOptions>(config.GetSection(VisionOptions.Section));
        services.Configure<ExportOptions>(config.GetSection(ExportOptions.Section));

        // R2 (S3-compatible). Built from R2Options at resolve time.
        services.AddSingleton<IAmazonS3>(sp =>
        {
            var r2 = config.GetSection(R2Options.Section).Get<R2Options>() ?? new R2Options();
            var creds = new BasicAWSCredentials(r2.AccessKeyId, r2.SecretAccessKey);
            var s3Config = new AmazonS3Config
            {
                ServiceURL = string.IsNullOrWhiteSpace(r2.Endpoint)
                    ? "https://localhost"           // placeholder until creds provided
                    : r2.Endpoint,
                ForcePathStyle = true,
                // R2 ignores region but the SDK requires one to be set.
                AuthenticationRegion = "auto",
                // AWSSDK.S3 ≥3.7.4xx adds a CRC32 integrity checksum to requests (and to the
                // SIGNED headers of presigned PUT URLs) by default. Cloudflare R2 doesn't
                // support it and rejects the upload ("Header 'x-amz-checksum-crc32' not
                // implemented"), which left the scans bucket empty and broke every scan.
                // WhenRequired restores the clean presign (X-Amz-SignedHeaders=host) R2 expects.
                RequestChecksumCalculation = RequestChecksumCalculation.WhenRequired,
                ResponseChecksumValidation = ResponseChecksumValidation.WhenRequired
            };
            return new AmazonS3Client(creds, s3Config);
        });

        services.AddHttpClient();
        services.AddSingleton<IPromptLibrary, PromptLibrary>();
        services.AddScoped<IStorageClient, R2StorageClient>();
        services.AddScoped<IVisionClient, TieredVisionClient>();
        services.AddScoped<IScanRepository, ScanRepository>();

        // Learning loop (spec §10.3): exporter + in-process nightly cron.
        services.AddScoped<IDatasetExporter, CorrectionsExporter>();
        services.AddHostedService<NightlyExportService>();

        return services;
    }

    /// <summary>
    /// Converts a Railway/Heroku-style <c>postgres://user:pass@host:port/db</c> URL into an
    /// Npgsql keyword connection string. Returns null when the input is empty/unparseable.
    /// </summary>
    internal static string? ConvertDatabaseUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        if (!url.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            // Already a keyword connection string (Host=...;...) — pass through.
            return url;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return null;
        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo[0]);
        var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var db = uri.AbsolutePath.TrimStart('/');
        var port = uri.Port > 0 ? uri.Port : 5432;

        // SSL Mode=Prefer keeps Railway's private-network (non-TLS) connections working
        // while still using TLS when the public proxy host requires it.
        return $"Host={uri.Host};Port={port};Database={db};Username={user};Password={pass};" +
               "SSL Mode=Prefer;Trust Server Certificate=true";
    }
}
