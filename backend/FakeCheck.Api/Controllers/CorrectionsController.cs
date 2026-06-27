using System.Text.Json;
using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using FakeCheck.Core.Models;
using FakeCheck.Core.Security;
using Microsoft.AspNetCore.Mvc;

namespace FakeCheck.Api.Controllers;

[ApiController]
[Route("corrections")]
public sealed class CorrectionsController : ControllerBase
{
    private readonly IScanRepository _repo;
    private readonly IStorageClient _storage;
    private readonly ILogger<CorrectionsController> _log;

    public CorrectionsController(IScanRepository repo, IStorageClient storage, ILogger<CorrectionsController> log)
    {
        _repo = repo;
        _storage = storage;
        _log = log;
    }

    /// <summary>
    /// Ingest a user dispute (spec §9.3). Supporting photos are copied into the corrections
    /// bucket with EXIF/GPS stripped (spec §14); the row is retained as training ground-truth.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(OkResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<OkResponse>> Submit([FromBody] CorrectionRequest req, CancellationToken ct)
    {
        // Ownership gate (spec §1.1): only the device that created the scan may dispute its verdict.
        var scan = await _repo.GetScanAsync(req.ScanId, ct);
        switch (ScanOwnership.Check(Request.Headers["X-Device-Id"].ToString(), scan?.DeviceId))
        {
            case OwnershipResult.MissingDeviceId:
                return Unauthorized("X-Device-Id header is required.");
            case OwnershipResult.ScanNotFound:
                return NotFound($"Scan '{req.ScanId}' not found.");
            case OwnershipResult.OwnerMismatch:
                return StatusCode(StatusCodes.Status403Forbidden, "Scan belongs to a different device.");
        }

        // Move supporting images to the corrections bucket (EXIF-stripped). Best-effort per image.
        var strippedUrls = new List<string>(req.SupportingImageUrls.Count);
        foreach (var key in req.SupportingImageUrls)
        {
            try
            {
                strippedUrls.Add(await _storage.CopyToCorrectionsStrippedAsync(key, ct));
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Could not EXIF-strip supporting image {Key}; keeping original key.", key);
                strippedUrls.Add(key);
            }
        }

        var correction = new Correction
        {
            ScanId = req.ScanId,
            UserCorrection = req.UserCorrection,
            Explanation = req.Explanation,
            SupportingImageUrls = strippedUrls,
            OriginalVerdict = req.OriginalVerdict,
            OriginalConfidence = req.OriginalConfidence,
            ItemCategory = req.ItemCategory,
            ProductId = req.ProductId,
            OriginalChecks = JsonSerializer.Serialize(req.OriginalChecks),
            AllScanImageUrls = req.AllScanImageUrls.ToList(),
            AppVersion = req.AppVersion,
            Platform = req.Platform
        };

        await _repo.SaveCorrectionAsync(correction, ct);
        _log.LogInformation("Correction ingested for scan {ScanId} ({Category}).", req.ScanId, req.ItemCategory);
        return Ok(new OkResponse(true));
    }
}
