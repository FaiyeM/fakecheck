namespace FakeCheck.Core.Models;

/// <summary>One step in a category's guided authentication flow (spec §6, §7.1).</summary>
public class AuthStep
{
    public int Id { get; set; }
    public string CategoryId { get; set; } = default!;
    public Category? Category { get; set; }

    /// <summary>Display order within the category flow.</summary>
    public int Ordinal { get; set; }
    public string InstructionTitle { get; set; } = default!;
    public string TipText { get; set; } = default!;
    public string? ReferenceImageUrl { get; set; }
    public Requirement Requirement { get; set; }

    /// <summary>JSON describing the condition for a conditional step (nullable).</summary>
    public string? ConditionJson { get; set; }

    /// <summary>Stable check id mapping to the prompt library, e.g. <c>date_code</c>.</summary>
    public string CheckId { get; set; } = default!;

    /// <summary>Engine weight: 1 supporting, 2 strong, 3 critical (spec §7.1).</summary>
    public int Weight { get; set; }
}
