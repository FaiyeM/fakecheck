using FakeCheck.Api.Dtos;
using FakeCheck.Core.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace FakeCheck.Api.Controllers;

[ApiController]
[Route("categories")]
public sealed class CategoriesController : ControllerBase
{
    private readonly IScanRepository _repo;

    public CategoriesController(IScanRepository repo) => _repo = repo;

    /// <summary>Ordered auth-step flow for a category, for the guided UI (spec §9.1).</summary>
    [HttpGet("{id}/steps")]
    [ProducesResponseType(typeof(IReadOnlyList<StepDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StepDto>>> GetSteps(string id, CancellationToken ct)
    {
        var steps = await _repo.GetStepsAsync(id, ct);
        if (steps.Count == 0) return NotFound();

        var dto = steps.Select(s => new StepDto(
            s.Id, s.Ordinal, s.CheckId, s.InstructionTitle, s.TipText,
            s.ReferenceImageUrl, s.Requirement.ToString().ToLowerInvariant(), s.Weight)).ToList();
        return Ok(dto);
    }
}
