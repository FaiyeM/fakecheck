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
        // EF Core / Postgres
        var conn = config.GetConnectionString("Default")
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
}
