namespace FakeCheck.Core.Models;

/// <summary>A launch category, e.g. <c>sneaker</c> (spec §5.2, 4 launch categories).</summary>
public class Category
{
    /// <summary>Slug primary key, e.g. <c>sneaker</c>.</summary>
    public string Id { get; set; } = default!;
    public string DisplayName { get; set; } = default!;
    public bool Active { get; set; } = true;

    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<AuthStep> AuthSteps { get; set; } = new List<AuthStep>();
}
