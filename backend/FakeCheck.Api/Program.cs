using System.Threading.RateLimiting;
using FakeCheck.Api.Validation;
using FakeCheck.Infrastructure;
using FakeCheck.Infrastructure.Data;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// --- Kestrel: bind 0.0.0.0 and honour Railway's injected PORT (spec Phase 3/8). ---
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// --- Structured logging (Serilog). ---
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// --- Infrastructure (EF, R2, vision, repo). ---
builder.Services.AddFakeCheckInfrastructure(builder.Configuration);

// --- MVC + validation. ---
builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<PresignRequestValidator>();

// --- RFC-7807 problem details + global exception handling. ---
builder.Services.AddProblemDetails();

// --- OpenAPI/Swagger. ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new() { Title = "FakeCheck API", Version = "v1" }));

// --- Rate limiting (spec Phase 7). ---
// Two layers run together on the paid vision endpoints:
//   • Global limiter: 60/min per anonymous device id (broad fairness).
//   • "vision" policy: a tighter per-IP fixed window applied to /identify and /auth/analyze.
// X-Device-Id is client-supplied and can be rotated to defeat the global cap, so the per-IP
// limiter bounds the cost of the paid vision calls regardless of the device header
// (SECURITY_REVIEW.md finding #2).
var globalPerDevice = builder.Configuration.GetValue("RateLimit:GlobalPerDevicePerMinute", 60);
var visionPerIp = builder.Configuration.GetValue("RateLimit:VisionPerIpPerMinute", 20);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var deviceId = httpContext.Request.Headers["X-Device-Id"].FirstOrDefault()
                       ?? httpContext.Connection.RemoteIpAddress?.ToString()
                       ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(deviceId, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = globalPerDevice,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
    options.AddPolicy("vision", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = visionPerIp,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled", false))
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "FakeCheck API v1"));
}

app.UseSerilogRequestLogging();
app.UseRateLimiter();
app.MapControllers();

// --- Migrate + seed on startup (best-effort; never block boot if DB is unreachable). ---
if (builder.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var startupLog = scope.ServiceProvider.GetService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<FakeCheckDbContext>();

        // No EF migrations exist yet (the build sandbox has no .NET SDK), so bootstrap the schema
        // directly from the model. We deliberately do NOT use EnsureCreated/HasTables — both
        // misbehave on a managed-but-empty Postgres (EnsureCreated no-ops because the database
        // already exists). Instead: probe for a known table, and if it's absent run the model's
        // full CREATE script. Idempotent and provider-agnostic. Switch to MigrateAsync() once a
        // migration file is generated on an SDK-equipped environment.
        var creator = db.GetService<IRelationalDatabaseCreator>();
        if (!await creator.ExistsAsync())
        {
            await creator.CreateAsync();
            startupLog?.LogInformation("Startup: database did not exist — created it.");
        }

        bool hasSchema;
        try { _ = await db.Categories.AnyAsync(); hasSchema = true; }
        catch { hasSchema = false; }
        startupLog?.LogInformation("Startup: categories table present = {Has}", hasSchema);

        if (!hasSchema)
        {
            var script = db.Database.GenerateCreateScript();
            await db.Database.ExecuteSqlRawAsync(script);
            startupLog?.LogInformation("Startup: schema created from model ({Len} chars of DDL).", script.Length);
        }

        await DbSeeder.SeedAsync(db, startupLog);
        startupLog?.LogInformation("Startup: schema + seed complete.");
    }
    catch (Exception ex)
    {
        (startupLog ?? app.Logger).LogError(ex, "Startup schema-create/seed failed.");
    }
}

// --- R2 storage config diagnostic (no secrets) — confirms storage is wired before first upload. ---
using (var r2scope = app.Services.CreateScope())
{
    var r2 = r2scope.ServiceProvider.GetRequiredService<IOptions<R2Options>>().Value;
    var r2host = "UNSET";
    if (!string.IsNullOrWhiteSpace(r2.Endpoint) && Uri.TryCreate(r2.Endpoint, UriKind.Absolute, out var u))
        r2host = u.Host;
    app.Logger.LogInformation(
        "[startup] R2 configured={Cfg} endpoint={Host} buckets={Scans}/{Corr}/{Ref}",
        r2.IsConfigured, r2host, r2.BucketScans, r2.BucketCorrections, r2.BucketReference);
}

// --- Vision config diagnostic (no secrets) — confirms Gemini/Premium are wired at startup. ---
using (var visionScope = app.Services.CreateScope())
{
    var opts = visionScope.ServiceProvider.GetRequiredService<IOptions<VisionOptions>>().Value;
    
    var envKeys = Environment.GetEnvironmentVariables().Keys.Cast<string>()
        .Where(k => k.Contains("Vision", StringComparison.OrdinalIgnoreCase) || k.Contains("Gemini", StringComparison.OrdinalIgnoreCase))
        .ToList();
    
    app.Logger.LogInformation(
        "[startup] Vision environment keys: {EnvKeys}", string.Join(", ", envKeys));
        
    app.Logger.LogInformation(
        "[startup] Vision Gemini configured={GeminiCfg} model={GeminiModel}; Premium configured={PremiumCfg} provider={PremiumProv} model={PremiumModel}",
        opts.Gemini.IsConfigured, opts.Gemini.Model, opts.Premium.IsConfigured, opts.Premium.Provider, opts.Premium.Model);
}

app.Run();

/// <summary>Exposed for WebApplicationFactory-based integration tests.</summary>
public partial class Program { }
