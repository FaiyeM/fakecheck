using FakeCheck.Infrastructure.Vision;
using Xunit;

namespace FakeCheck.Tests;

public class CategoryNormalizationTests
{
    [Theory]
    // Sneakers synonyms
    [InlineData("sneaker", "sneaker")]
    [InlineData("sneakers", "sneaker")]
    [InlineData("runner", "sneaker")]
    [InlineData("runners", "sneaker")]
    [InlineData("jogger", "sneaker")]
    [InlineData("trainer", "sneaker")]
    [InlineData("footwear", "sneaker")]
    [InlineData("shoe", "sneaker")]
    [InlineData("shoes", "sneaker")]
    [InlineData("athletic shoe", "sneaker")]
    [InlineData("sport shoe", "sneaker")]
    [InlineData("  SNEAKER  ", "sneaker")]
    
    // Handbags synonyms
    [InlineData("handbag", "handbag")]
    [InlineData("handbags", "handbag")]
    [InlineData("bag", "handbag")]
    [InlineData("bags", "handbag")]
    [InlineData("purse", "handbag")]
    [InlineData("purses", "handbag")]
    [InlineData("pocketbook", "handbag")]
    [InlineData("tote", "handbag")]
    [InlineData("clutch", "handbag")]
    
    // Pokemon synonyms
    [InlineData("pokemon", "pokemon")]
    [InlineData("pokémon", "pokemon")]
    [InlineData("trading card", "pokemon")]
    [InlineData("collectible card", "pokemon")]
    [InlineData("card", "pokemon")]
    
    // Watch synonyms
    [InlineData("watch", "watch")]
    [InlineData("timepiece", "watch")]
    [InlineData("wristwatch", "watch")]
    [InlineData("wrist watch", "watch")]
    
    // Unknown or unsupported categories
    [InlineData("", "unknown")]
    [InlineData("   ", "unknown")]
    [InlineData(null, "unknown")]
    [InlineData("lamp", "lamp")]
    [InlineData("furniture", "furniture")]
    public void NormalizeCategory_MapsSynonymsCorrectly(string? input, string expected)
    {
        var result = TieredVisionClient.NormalizeCategory(input!);
        Assert.Equal(expected, result);
    }
}
