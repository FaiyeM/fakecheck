namespace FakeCheck.Core.Models;

/// <summary>A specific product line, e.g. <c>lv_neverfull_mm</c> (spec §7.2 fake_bar).</summary>
public class Product
{
    /// <summary>Slug primary key, e.g. <c>lv_neverfull_mm</c>.</summary>
    public string Id { get; set; } = default!;
    public string CategoryId { get; set; } = default!;
    public Category? Category { get; set; }
    public string Brand { get; set; } = default!;
    public string Line { get; set; } = default!;

    /// <summary>
    /// Additive bump to the Authentic threshold for high-counterfeit products
    /// (e.g. Yeezy, LV). 0 for normal items (spec §7.2).
    /// </summary>
    public decimal FakeBar { get; set; }
}
