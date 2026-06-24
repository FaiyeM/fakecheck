using FakeCheck.Core.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FakeCheck.Infrastructure.Learning;

/// <summary>
/// Lean nightly cron (spec §10.3): once per day, at the configured UTC hour, export the last
/// ~25h of corrections to a labeled JSONL dataset in R2. Runs in-process so no extra Railway
/// service is needed. Disabled when <see cref="ExportOptions.Enabled"/> is false.
/// </summary>
public sealed class NightlyExportService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ExportOptions _opts;
    private readonly ILogger<NightlyExportService> _log;

    public NightlyExportService(
        IServiceScopeFactory scopeFactory,
        IOptions<ExportOptions> opts,
        ILogger<NightlyExportService> log)
    {
        _scopeFactory = scopeFactory;
        _opts = opts.Value;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_opts.Enabled)
        {
            _log.LogInformation("Nightly corrections export disabled (Export:Enabled=false).");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNextRun(DateTimeOffset.UtcNow, _opts.RunHourUtc);
            _log.LogInformation("Next corrections export in {Hours:F1}h (at {Hour:00}:00 UTC).", delay.TotalHours, _opts.RunHourUtc);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var exporter = scope.ServiceProvider.GetRequiredService<IDatasetExporter>();
                // Overlap by an hour so a slightly-late run never drops corrections.
                var since = DateTimeOffset.UtcNow.AddHours(-25);
                var result = await exporter.ExportCorrectionsAsync(since, stoppingToken);
                _log.LogInformation("Nightly export complete: {Count} records → {Key}", result.RecordCount, result.Key);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Nightly corrections export failed; will retry tomorrow.");
            }
        }
    }

    /// <summary>Time from <paramref name="now"/> to the next occurrence of <paramref name="hourUtc"/>:00 UTC.</summary>
    internal static TimeSpan TimeUntilNextRun(DateTimeOffset now, int hourUtc)
    {
        hourUtc = Math.Clamp(hourUtc, 0, 23);
        var next = new DateTimeOffset(now.Year, now.Month, now.Day, hourUtc, 0, 0, TimeSpan.Zero);
        if (next <= now) next = next.AddDays(1);
        return next - now;
    }
}
