using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FakeCheck.Infrastructure.Vision;

/// <summary>
/// Loads version-controlled per-check system prompts from <c>docs/prompts/{category}/{checkId}.md</c>
/// (the core IP, spec §17 Q2). Prompts are cached after first read. The base directory is
/// configurable via <c>Prompts:Directory</c>; it defaults to a path relative to the content root.
/// </summary>
public interface IPromptLibrary
{
    /// <summary>Returns the system prompt for a category/check, or a safe generic fallback.</summary>
    string GetCheckPrompt(string category, string checkId);
}

public sealed class PromptLibrary : IPromptLibrary
{
    private readonly string _baseDir;
    private readonly ILogger<PromptLibrary> _log;
    private readonly ConcurrentDictionary<string, string> _cache = new();

    public PromptLibrary(IConfiguration config, ILogger<PromptLibrary> log)
    {
        _log = log;
        var configured = config["Prompts:Directory"];
        _baseDir = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(AppContext.BaseDirectory, "docs", "prompts")
            : configured;
    }

    public string GetCheckPrompt(string category, string checkId)
    {
        var key = $"{category}/{checkId}";
        return _cache.GetOrAdd(key, k =>
        {
            var path = Path.Combine(_baseDir, category, checkId + ".md");
            if (File.Exists(path))
                return File.ReadAllText(path);

            _log.LogWarning("Prompt not found at {Path}; using generic fallback.", path);
            return
                $"You are an expert {category} authenticator examining the '{checkId}' detail. " +
                "Assess authenticity from the image and score it 0-100, where higher means more likely authentic.";
        });
    }
}
