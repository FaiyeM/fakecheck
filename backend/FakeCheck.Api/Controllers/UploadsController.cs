using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace FakeCheck.Api.Controllers;

[ApiController]
[Route("uploads")]
public sealed class UploadsController : ControllerBase
{
    private readonly IStorageClient _storage;

    public UploadsController(IStorageClient storage) => _storage = storage;

    /// <summary>Issue presigned R2 PUT URLs so the client uploads image bytes directly (spec Phase 4).</summary>
    [HttpPost("presign")]
    [ProducesResponseType(typeof(PresignResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PresignResponse>> Presign([FromBody] PresignRequest req, CancellationToken ct)
    {
        var uploads = await _storage.CreatePresignedUploadsAsync(req.Count, ct);
        return Ok(new PresignResponse(uploads.Select(u => new PresignItem(u.Key, u.Url)).ToList()));
    }
}
