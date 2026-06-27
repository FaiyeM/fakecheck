using FakeCheck.Core.Authentication;
using FakeCheck.Core.Models;
using Xunit;

namespace FakeCheck.Tests;

public class ProductResolverTests
{
    // A representative slice of the seeded products (see DbSeeder).
    private static IReadOnlyList<Product> Seed() => new[]
    {
        P("nike_air_jordan_1", "sneaker", "Nike", "Air Jordan 1"),
        P("nike_dunk", "sneaker", "Nike", "Dunk"),
        P("adidas_yeezy_350", "sneaker", "Adidas", "Yeezy Boost 350"),
        P("new_balance_990", "sneaker", "New Balance", "990"),
        P("lv_neverfull_mm", "handbag", "Louis Vuitton", "Neverfull MM"),
        P("rolex_submariner", "watch", "Rolex", "Submariner"),
    };

    private static Product P(string id, string cat, string brand, string line) =>
        new() { Id = id, CategoryId = cat, Brand = brand, Line = line };

    [Fact] // Acceptance: Nike / "Air Jordan 1" -> nike_air_jordan_1.
    public void Resolves_brand_and_line_to_slug()
        => Assert.Equal("nike_air_jordan_1", ProductResolver.Resolve(Seed(), "Nike", "Air Jordan 1"));

    [Fact] // Regression: the old free-text path (line only, no brand) must now resolve, not yield null.
    public void Resolves_free_text_line_without_brand()
        => Assert.Equal("nike_air_jordan_1", ProductResolver.Resolve(Seed(), null, "Air Jordan 1"));

    [Theory] // Case / spacing / punctuation insensitive, and more-specific lines still resolve.
    [InlineData("  air   jordan 1 ", "nike_air_jordan_1")]
    [InlineData("Air Jordan 1 Retro High OG", "nike_air_jordan_1")]
    [InlineData("Yeezy Boost 350", "adidas_yeezy_350")]
    [InlineData("Neverfull MM", "lv_neverfull_mm")]
    public void Resolves_loose_matches(string line, string expected)
        => Assert.Equal(expected, ProductResolver.Resolve(Seed(), null, line));

    [Fact] // A mismatched brand gates out an otherwise-matching line.
    public void Brand_mismatch_blocks_resolution()
        => Assert.Null(ProductResolver.Resolve(Seed(), "Adidas", "Air Jordan 1"));

    [Theory] // No usable line / no match -> null (fake_bar stays 0).
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Totally Unknown Sneaker XYZ")]
    public void Returns_null_when_unresolvable(string? line)
        => Assert.Null(ProductResolver.Resolve(Seed(), null, line));

    [Fact]
    public void Returns_null_for_empty_candidate_set()
        => Assert.Null(ProductResolver.Resolve(System.Array.Empty<Product>(), "Nike", "Air Jordan 1"));
}
