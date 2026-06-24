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

    public AdminController(IDatasetExporter exporter, IOptions<ExportOptions> opts)
    {
        _exporter = exporter;
        _opts = opts.Value;
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
        var result = await _exporter.ExportCorrectionsAsync(since, ct);
        return Ok(new ExportResponse(result.Key, result.RecordCount));
    }
}
