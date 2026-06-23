using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using FakeCheck.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace FakeCheck.Api.Controllers;

[ApiController]
[Route("scans")]
public sealed class ScansController : ControllerBase
{
    private readonly IScanRepository _repo;

    public ScansController(IScanRepository repo) => _repo = repo;

    /// <summary>Create a scan record after identification (spec §9.1).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CreateScanResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CreateScanResponse>> Create([FromBody] CreateScanRequest req, CancellationToken ct)
    {
        var scan = new Scan
        {
            DeviceId = req.DeviceId,
            CategoryId = req.Category,
            ProductId = req.Product,
            IdentifiedAt = DateTimeOffset.UtcNow,
            Status = "identified"
        };
        await _repo.CreateScanAsync(scan, ct);
        return CreatedAtAction(nameof(Create), new { id = scan.Id }, new CreateScanResponse(scan.Id));
    }
}
