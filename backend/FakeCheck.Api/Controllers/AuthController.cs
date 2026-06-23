using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using FakeCheck.Core.Authentication;
using FakeCheck.Core.Models;
using FakeCheck.Infrastructure;
using FakeCheck.Infrastructure.Vision;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace FakeCheck.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IScanRepository _repo;
    private readonly IVisionClient _vision;
    private readonly IPromptLibrary _prompts;
    private readonly VisionOptions _visionOpts;
    private readonly ILogger<AuthController> _log;

    public AuthController(
        IScanRepository repo,
        IVisionClient vision,
        IPromptLibrary prompts,
        IOptions<VisionOptions> visionOpts,
        ILogger<AuthController> log)
    {
        _repo = repo;
        _vision = vision;
        _prompts = prompts;
        _visionOpts = visionOpts.Value;
        _log = log;
    }

    /// <summary>
    /// Tier-2 multi-photo analysis → verdict (spec §9.2). Runs each photographed check through
    /// the premium vision model with its step-specific prompt, then applies the verdict engine
    /// (weights, thresholds, per-product fake bar, hard fails, required-step gate).
    /// </summary>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(AnalyzeResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AnalyzeResponse>> Analyze([FromBody] AnalyzeRequest req, CancellationToken ct)
    {
        var steps = await _repo.GetStepsAsync(req.ItemCategory, ct);
        if (steps.Count == 0) return NotFound($"Unknown category '{req.ItemCategory}'.");

        var stepByCheck = steps.ToDictionary(s => s.CheckId, s => s);

        // Cost guardrail: cap the number of premium calls per scan (spec Phase 5).
        var photos = req.Photos
            .Where(p => stepByCheck.ContainsKey(p.CheckId))
            .Take(_visionOpts.MaxAuthCallsPerScan)
            .ToList();

        var checkInputs = new List<CheckInput>(photos.Count);
        var persistChecks = new List<Check>(photos.Count);
        var checkDtos = new List<CheckDto>(photos.Count);

        foreach (var photo in photos)
        {
            var step = stepByCheck[photo.CheckId];
            var prompt = _prompts.GetCheckPrompt(req.ItemCategory, photo.CheckId);
            var r = await _vision.RunCheckAsync(photo.CheckId, prompt, photo.ImageKey, ct);

            var isCritical = step.Weight >= 3;
            checkInputs.Add(new CheckInput(
                CheckId: photo.CheckId,
                Score: r.Score,
                Weight: step.Weight,
                Result: r.Result,
                IsCritical: isCritical,
                HardFail: r.HardFail,
                Observation: r.Observations));

            persistChecks.Add(new Check
            {
                CheckId = photo.CheckId,
                Score = r.Score,
                Result = r.Result.ToString().ToLowerInvariant(),
                Observation = r.Observations,
                RawModelJson = r.RawJson
            });

            checkDtos.Add(new CheckDto(
                step.InstructionTitle, r.Score, r.Result.ToString().ToLowerInvariant(), r.Observations));
        }

        // Required-step gate input: every required step + whether a photo was supplied.
        var providedCheckIds = photos.Select(p => p.CheckId).ToHashSet();
        var stepStatuses = steps
            .Select(s => new StepStatus(s.CheckId, s.Requirement == Requirement.Required, providedCheckIds.Contains(s.CheckId)))
            .ToList();

        var fakeBar = 0m;
        if (!string.IsNullOrWhiteSpace(req.ProductId))
        {
            var product = await _repo.GetProductAsync(req.ProductId, ct);
            if (product is not null) fakeBar = product.FakeBar;
        }

        var verdict = VerdictEngine.Evaluate(new VerdictInput(
            Category: req.ItemCategory,
            Checks: checkInputs,
            Steps: stepStatuses,
            FakeBar: fakeBar));

        // Persist checks + verdict (best-effort; analysis still returns if persistence fails).
        try
        {
            await _repo.SaveChecksAsync(req.ScanId, persistChecks, ct);
            await _repo.SaveVerdictAsync(new Verdict
            {
                ScanId = req.ScanId,
                Result = verdict.Verdict.ToString().ToLowerInvariant(),
                OverallConfidence = verdict.OverallConfidence,
                HardFailTriggered = verdict.HardFailTriggered
            }, ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to persist analysis for scan {ScanId}.", req.ScanId);
        }

        return Ok(new AnalyzeResponse(
            Verdict: verdict.Verdict.ToString().ToLowerInvariant(),
            OverallConfidence: Math.Round(verdict.OverallConfidence, 2),
            HardFailTriggered: verdict.HardFailTriggered,
            CanProduceVerdict: verdict.CanProduceVerdict,
            MissingRequiredSteps: verdict.MissingRequiredSteps,
            UncertainChecks: verdict.UncertainChecks,
            SuggestedVerificationServices: verdict.SuggestedVerificationServices,
            Checks: checkDtos,
            Disclaimer: verdict.Disclaimer));
    }
}
