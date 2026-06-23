using System.Threading.RateLimiting;
using FakeCheck.Api.Validation;
using FakeCheck.Infrastructure;
using FakeCheck.Infrastructure.Data;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
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

// --- Rate limit by anonymous device id (spec Phase 7). ---
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
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled", true))
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
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<FakeCheckDbContext>();
        await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetService<ILogger<Program>>());
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Startup migration/seed skipped — database not reachable yet.");
    }
}

app.Run();

/// <summary>Exposed for WebApplicationFactory-based integration tests.</summary>
public partial class Program { }
