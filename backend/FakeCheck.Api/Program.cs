using System.Threading.RateLimiting;
using FakeCheck.Api.Validation;
using FakeCheck.Infrastructure;
using FakeCheck.Infrastructure.Data;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
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
        // No EF migrations are generated yet (the build sandbox has no .NET SDK), so create the
        // schema directly from the model. NOTE: EnsureCreatedAsync only creates the schema when
        // the *database* is absent — on managed Postgres (Railway) the database already exists but
        // is empty, so we must create the model's tables explicitly via the relational creator.
        // Switch to db.Database.MigrateAsync() once a migration file exists.
        var creator = db.GetService<IRelationalDatabaseCreator>();
        if (!await creator.ExistsAsync())
            await creator.CreateAsync();          // create the database itself (local dev)
        if (!await creator.HasTablesAsync())
            await creator.CreateTablesAsync();    // create the model's tables in the existing DB
        await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetService<ILogger<Program>>());
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Startup schema-create/seed failed (DB unreachable or schema error).");
    }
}

app.Run();

/// <summary>Exposed for WebApplicationFactory-based integration tests.</summary>
public partial class Program { }
