using Amazon.Runtime;
using Amazon.S3;
using FakeCheck.Core.Abstractions;
using FakeCheck.Infrastructure.Data;
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
        // Priority: explicit ConnectionStrings__Default, else Railway's injected
        // DATABASE_URL (postgres:// URI, auto-converted), else a local dev default.
        var conn = config.GetConnectionString("Default")
                   ?? ConvertDatabaseUrl(Environment.GetEnvironmentVariable("DATABASE_URL"))
                   ?? "Host=localhost;Port=5432;Database=fakecheck;Username=postgres;Password=dev";
        services.AddDbContext<FakeCheckDbContext>(o => o.UseNpgsql(conn));

        // Options
        services.Configure<R2Options>(config.GetSection(R2Options.Section));
        services.Configure<VisionOptions>(config.GetSection(VisionOptions.Section));

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
                AuthenticationRegion = "auto"
            };
            return new AmazonS3Client(creds, s3Config);
        });

        services.AddHttpClient();
        services.AddSingleton<IPromptLibrary, PromptLibrary>();
        services.AddScoped<IStorageClient, R2StorageClient>();
        services.AddScoped<IVisionClient, TieredVisionClient>();
        services.AddScoped<IScanRepository, ScanRepository>();

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
