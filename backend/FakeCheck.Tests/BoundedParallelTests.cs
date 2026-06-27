using FakeCheck.Core.Concurrency;
using Xunit;

namespace FakeCheck.Tests;

public class BoundedParallelTests
{
    [Fact]
    public async Task Caps_concurrency_at_the_limit_but_still_runs_in_parallel()
    {
        const int limit = 4;
        var input = Enumerable.Range(0, 12).ToList();
        var current = 0;
        var observedMax = 0;

        await BoundedParallel.MapAsync(input, limit, async (_, ct) =>
        {
            var now = Interlocked.Increment(ref current);
            InterlockedMax(ref observedMax, now);
            await Task.Delay(40, ct);
            Interlocked.Decrement(ref current);
            return 0;
        });

        Assert.True(observedMax <= limit, $"observed {observedMax} > limit {limit}");
        Assert.True(observedMax >= 2, "expected real parallelism, ran effectively sequentially");
    }

    [Fact]
    public async Task Preserves_input_order_in_results()
    {
        var input = Enumerable.Range(0, 10).ToList();

        // Reverse the natural completion order: earlier items sleep longer.
        var results = await BoundedParallel.MapAsync(input, 4, async (n, ct) =>
        {
            await Task.Delay((10 - n) * 5, ct);
            return n * 2;
        });

        Assert.Equal(input.Select(n => n * 2).ToList(), results.ToList());
    }

    [Fact]
    public async Task Empty_source_returns_empty()
    {
        var results = await BoundedParallel.MapAsync(
            System.Array.Empty<int>(), 4, (n, ct) => Task.FromResult(n));
        Assert.Empty(results);
    }

    [Fact]
    public async Task Limit_below_one_is_clamped_to_serial()
    {
        var input = Enumerable.Range(0, 3).ToList();
        var results = await BoundedParallel.MapAsync(input, 0, (n, ct) => Task.FromResult(n + 1));
        Assert.Equal(new[] { 1, 2, 3 }, results.ToList());
    }

    private static void InterlockedMax(ref int target, int value)
    {
        int snapshot;
        do
        {
            snapshot = Volatile.Read(ref target);
            if (value <= snapshot) return;
        }
        while (Interlocked.CompareExchange(ref target, value, snapshot) != snapshot);
    }
}
