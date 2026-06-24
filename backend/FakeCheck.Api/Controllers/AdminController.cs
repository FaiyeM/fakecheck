using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using FakeCheck.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace FakeCheck.Api.Controllers;

/// <summary>
/// Operator-only endpoints. Guarded by a shared secret (<c>Export:AdminToken</c> via the
/// <c>X-Admin-Token</c> header) so the nightly learning-loop export can also be triggered
/// on demand (spec §10.3 verification). Disabled entirely when no token is configured.
/// </summary>
[ApiController]
[Route("admin")]
public sealed class AdminController : ControllerBase
{
    private readonly IDatasetExporter _exporter;
    private readonly ExportOptions _opts;
    private readonly ILogger<AdminController> _log;

    public AdminController(IDatasetExporter exporter, IOptions<ExportOptions> opts, ILogger<AdminController> log)
    {
        _exporter = exporter;
        _opts = opts.Value;
        _log = log;
    }

    /// <summary>Manually run the corrections export over the last <paramref name="sinceDays"/> days.</summary>
    [HttpPost("export")]
    [ProducesResponseType(typeof(ExportResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExportResponse>> Export([FromQuery] int sinceDays, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_opts.AdminToken))
            return NotFound();

        var provided = Request.Headers["X-Admin-Token"].FirstOrDefault();
        if (!string.Equals(provided, _opts.AdminToken, StringComparison.Ordinal))
            return Unauthorized();

        var days = sinceDays > 0 ? sinceDays : 1;
        var since = DateTimeOffset.UtcNow.AddDays(-days);
        try
        {
            var result = await _exporter.ExportCorrectionsAsync(since, ct);
            return Ok(new ExportResponse(result.Key, result.RecordCount));
        }
        catch (Exception ex)
        {
            // Admin-only endpoint: log AND surface the real cause to speed up diagnosis
            // (most likely R2 bucket/credentials/endpoint config).
            _log.LogError(ex, "Export failed: {Type}: {Message}", ex.GetType().Name, ex.Message);
            return Problem(
                title: "Export failed",
                detail: $"{ex.GetType().Name}: {ex.Message}",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
