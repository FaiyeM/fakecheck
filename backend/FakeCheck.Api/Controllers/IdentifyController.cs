using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FakeCheck.Api.Controllers;

[ApiController]
[Route("identify")]
[EnableRateLimiting("vision")]
public sealed class IdentifyController : ControllerBase
{
    private readonly IVisionClient _vision;

    public IdentifyController(IVisionClient vision) => _vision = vision;

    /// <summary>Tier-1 identification from a single photo key (spec §9.1).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(IdentificationResult), StatusCodes.Status200OK)]
    public async Task<ActionResult<IdentificationResult>> Identify([FromBody] IdentifyRequest req, CancellationToken ct)
    {
        var result = await _vision.IdentifyAsync(req.ImageKey, ct);
        return Ok(result);
    }
}
