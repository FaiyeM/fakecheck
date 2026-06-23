namespace FakeCheck.Core.Models;

/// <summary>Whether a photo step blocks the verdict (spec §4.4).</summary>
public enum Requirement
{
    Required,
    Optional,
    Conditional
}
