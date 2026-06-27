using System.Text;
using FakeCheck.Core.Models;

namespace FakeCheck.Core.Authentication;

/// <summary>
/// Resolves a free-text identification (brand + line, e.g. <c>Nike</c> / <c>Air Jordan 1</c>)
/// to a canonical product slug (e.g. <c>nike_air_jordan_1</c>) so the per-product
/// <c>fake_bar</c> actually fires (spec §1). Pure and table-backed: the caller supplies the
/// candidate <see cref="Product"/> rows (e.g. the seeded products for the scan's category),
/// matched case/space/punctuation-insensitively. Returns <c>null</c> when nothing matches.
/// </summary>
public static class ProductResolver
{
    /// <summary>
    /// Returns the slug of the best-matching product, or <c>null</c>. Matching is loose
    /// (normalised contains-match on the line); when <paramref name="brand"/> is supplied it
    /// must also match. Ties resolve to the most specific (longest) product line.
    /// </summary>
    public static string? Resolve(IReadOnlyCollection<Product> products, string? brand, string? line)
    {
        if (products is null || products.Count == 0) return null;

        var qLine = Normalize(line);
        if (qLine.Length == 0) return null;
        var qBrand = Normalize(brand);

        Product? best = null;
        var bestLen = 0;
        foreach (var p in products)
        {
            var pLine = Normalize(p.Line);
            if (pLine.Length == 0 || !LooseMatch(qLine, pLine)) continue;

            if (qBrand.Length > 0)
            {
                var pBrand = Normalize(p.Brand);
                if (pBrand.Length > 0 && !LooseMatch(qBrand, pBrand)) continue;
            }

            if (pLine.Length > bestLen)
            {
                best = p;
                bestLen = pLine.Length;
            }
        }

        return best?.Id;
    }

    // Equal, or the longer string contains the shorter (min 3 chars, to avoid trivial substrings).
    private static bool LooseMatch(string a, string b)
    {
        if (a == b) return true;
        var (longer, shorter) = a.Length >= b.Length ? (a, b) : (b, a);
        return shorter.Length >= 3 && longer.Contains(shorter);
    }

    // Lowercase, drop punctuation, collapse runs of non-alphanumerics to single spaces.
    private static string Normalize(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var sb = new StringBuilder(s.Length);
        var prevSpace = true; // leading-space suppression
        foreach (var ch in s.ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(ch);
                prevSpace = false;
            }
            else if (!prevSpace)
            {
                sb.Append(' ');
                prevSpace = true;
            }
        }
        return sb.ToString().TrimEnd();
    }
}
