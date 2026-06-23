namespace FakeCheck.Core.Authentication;

/// <summary>
/// Reputable in-person / professional authentication services suggested when a verdict
/// is Inconclusive (spec §7.4). Keyed by category slug.
/// </summary>
public static class VerificationServices
{
    private static readonly IReadOnlyDictionary<string, string[]> ByCategory =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["sneaker"] = new[]
            {
                "Submit to a sneaker authentication service (e.g. CheckCheck, Legit App)",
                "Use a marketplace with built-in authentication (e.g. StockX, GOAT)"
            },
            ["handbag"] = new[]
            {
                "Submit photos to a luxury authentication service (e.g. Entrupy, Real Authentication)",
                "Visit an authorized brand boutique for in-person inspection"
            },
            ["pokemon"] = new[]
            {
                "Submit the card to a grading service (PSA, BGS/Beckett, or CGC)",
                "Have it reviewed by a reputable local card shop"
            },
            ["watch"] = new[]
            {
                "Take it to an authorized dealer or brand boutique",
                "Use a professional watch authentication service (e.g. WatchCSA) or a certified watchmaker"
            }
        };

    /// <summary>Returns suggested services for the category, or a generic fallback.</summary>
    public static IReadOnlyList<string> For(string category)
    {
        if (!string.IsNullOrWhiteSpace(category) && ByCategory.TryGetValue(category, out var services))
        {
            return services;
        }

        return new[] { "Have the item inspected in person by a reputable professional authenticator." };
    }
}
