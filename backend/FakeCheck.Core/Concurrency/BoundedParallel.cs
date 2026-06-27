namespace FakeCheck.Core.Concurrency;

/// <summary>
/// Runs an async body over a list with bounded concurrency (a <see cref="SemaphoreSlim"/> gate)
/// and returns the results in the original input order. Used to fan out the per-photo Tier-2
/// vision calls in analyze without overwhelming the provider (spec §9 parallel vision calls).
/// </summary>
public static class BoundedParallel
{
    /// <param name="maxDegreeOfParallelism">Upper bound on in-flight bodies (clamped to ≥ 1).</param>
    public static async Task<IReadOnlyList<TOut>> MapAsync<TIn, TOut>(
        IReadOnlyList<TIn> source,
        int maxDegreeOfParallelism,
        Func<TIn, CancellationToken, Task<TOut>> body,
        CancellationToken ct = default)
    {
        if (source.Count == 0) return Array.Empty<TOut>();

        var limit = Math.Max(1, maxDegreeOfParallelism);
        using var gate = new SemaphoreSlim(limit, limit);
        var results = new TOut[source.Count];

        async Task RunAsync(int index)
        {
            await gate.WaitAsync(ct);
            try
            {
                results[index] = await body(source[index], ct);
            }
            finally
            {
                gate.Release();
            }
        }

        var tasks = new Task[source.Count];
        for (var i = 0; i < source.Count; i++) tasks[i] = RunAsync(i);
        await Task.WhenAll(tasks);

        return results;
    }
}
